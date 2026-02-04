const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');
const Groq = require('groq-sdk');
require('dotenv').config();

const {
  initDatabase,
  // User
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  verifyPassword,
  // Settings
  getUserSettings,
  updateUserSettings,
  // Assistants
  getAllAssistants,
  getAssistantById,
  createAssistant,
  // Chats
  getUserChats,
  getChatById,
  createChat,
  updateChat,
  deleteChat,
  // Messages
  getChatMessages,
  addMessage,
  // Stats
  getUserStats,
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize AI Providers
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// ==================== AI HELPER WITH FALLBACK ====================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Convert Gemini-style contents to Groq/OpenAI-style messages
 */
const contentsToMessages = (contents, systemPrompt) => {
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  for (const item of contents) {
    const role = item.role === 'model' ? 'assistant' : 'user';
    const text = item.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
    if (text) {
      messages.push({ role, content: text });
    }
  }
  return messages;
};

/**
 * Call Groq API (fallback provider)
 */
const callGroq = async (contents, systemPrompt = '') => {
  if (!groq) throw new Error('Groq API key not configured');
  const messages = contentsToMessages(contents, systemPrompt);
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
};

/**
 * Call Groq streaming API (fallback provider)
 */
const callGroqStream = async (contents, systemPrompt = '') => {
  if (!groq) throw new Error('Groq API key not configured');
  const messages = contentsToMessages(contents, systemPrompt);
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 4096,
    stream: true,
  });
  return stream;
};

/**
 * Call Gemini with retry, then fallback to Groq if rate limited
 */
const callAI = async (contents, systemPrompt = '') => {
  // Try Gemini first
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
      });
      return { text: response.text || 'Sorry, I could not generate a response.', provider: 'gemini' };
    } catch (error) {
      const errorStr = String(error).toLowerCase();
      const isRateLimit = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('rate');

      if (isRateLimit && groq) {
        console.log('Gemini rate limited, falling back to Groq...');
      } else if (!groq) {
        throw error;
      } else {
        throw error;
      }
    }
  }

  // Fallback to Groq
  const text = await callGroq(contents, systemPrompt);
  return { text, provider: 'groq' };
};

/**
 * Call AI streaming - Gemini first, then fallback to Groq
 */
const callAIStream = async (contents, systemPrompt = '') => {
  // Try Gemini first
  if (ai) {
    try {
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents,
      });
      return { stream: response, provider: 'gemini', type: 'gemini' };
    } catch (error) {
      const errorStr = String(error).toLowerCase();
      const isRateLimit = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('rate');

      if (isRateLimit && groq) {
        console.log('Gemini stream rate limited, falling back to Groq...');
      } else if (!groq) {
        throw error;
      } else {
        throw error;
      }
    }
  }

  // Fallback to Groq streaming
  const stream = await callGroqStream(contents, systemPrompt);
  return { stream, provider: 'groq', type: 'groq' };
};

// ==================== AUTH MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional auth - doesn't fail if no token, just sets req.user to null
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? null : user;
    next();
  });
};

// ==================== HEALTH CHECK ====================

app.get('/', (req, res) => {
  res.json({
    status: 'AI Chat Backend is running!',
    version: '2.0.0',
    database: 'SQLite',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
      },
      assistants: 'GET /api/assistants',
      chats: 'GET/POST /api/chats',
      chat: 'POST /api/chat',
    }
  });
});

// ==================== AUTH ENDPOINTS ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = createUser(email, password, name);

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email', code: 'USER_NOT_FOUND' });
    }

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        plan: user.plan,
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = getUserSettings(req.user.id);
    const stats = getUserStats(req.user.id);

    res.json({
      success: true,
      user: {
        ...user,
        settings,
        stats,
      },
    });
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, avatar, phone } = req.body;
    const user = updateUser(req.user.id, { name, avatar, phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user settings
app.put('/api/auth/settings', authenticateToken, (req, res) => {
  try {
    const settings = updateUserSettings(req.user.id, req.body);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== ASSISTANT ENDPOINTS ====================

// Get all assistants (public)
app.get('/api/assistants', (req, res) => {
  try {
    const assistants = getAllAssistants();
    res.json({ success: true, assistants });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load assistants' });
  }
});

// Get single assistant
app.get('/api/assistants/:id', (req, res) => {
  try {
    const assistant = getAssistantById(req.params.id);
    if (!assistant) {
      return res.status(404).json({ error: 'Assistant not found' });
    }
    res.json({ success: true, assistant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load assistant' });
  }
});

// Create new assistant (authenticated)
app.post('/api/assistants', authenticateToken, (req, res) => {
  try {
    const { name, icon, icon_color, description, system_prompt } = req.body;

    if (!name || !system_prompt) {
      return res.status(400).json({ error: 'Name and system_prompt are required' });
    }

    const assistant = createAssistant({ name, icon, icon_color, description, system_prompt });
    res.json({ success: true, assistant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create assistant' });
  }
});

// ==================== CHAT ENDPOINTS ====================

// Get all chats for user
app.get('/api/chats', authenticateToken, (req, res) => {
  try {
    const chats = getUserChats(req.user.id);
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load chats' });
  }
});

// Get single chat with messages
app.get('/api/chats/:id', authenticateToken, (req, res) => {
  try {
    const chat = getChatById(req.params.id, req.user.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = getChatMessages(req.params.id, req.user.id);
    res.json({ success: true, chat: { ...chat, messages } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load chat' });
  }
});

// Create new chat
app.post('/api/chats', authenticateToken, (req, res) => {
  try {
    const { name, assistantId, icon, iconColor, systemPrompt } = req.body;

    // Get assistant if provided
    let assistant = null;
    if (assistantId) {
      assistant = getAssistantById(assistantId);
    }

    const chat = createChat(req.user.id, {
      name: name || (assistant ? assistant.name : 'New Chat'),
      assistant_id: assistantId || null,
      icon: icon || (assistant ? assistant.icon : 'MessageSquare'),
      icon_color: iconColor || (assistant ? assistant.icon_color : '#6F00FF'),
      system_prompt: systemPrompt || (assistant ? assistant.system_prompt : ''),
    });

    res.json({ success: true, chat });
  } catch (error) {
    console.error('Create Chat Error:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Update chat
app.put('/api/chats/:id', authenticateToken, (req, res) => {
  try {
    const chat = updateChat(req.params.id, req.user.id, req.body);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Delete chat
app.delete('/api/chats/:id', authenticateToken, (req, res) => {
  try {
    const deleted = deleteChat(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// ==================== AI CHAT ENDPOINT ====================

app.post('/api/chat', optionalAuth, async (req, res) => {
  try {
    const { message, history, systemPrompt, chatId, image } = req.body;

    console.log('\n=== CHAT REQUEST ===');
    console.log('Message:', message);
    console.log('User:', req.user ? req.user.email : 'Guest');
    console.log('Has Image:', !!image);
    console.log('====================\n');

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'No AI API key configured' });
    }

    // Build contents for Gemini-style format
    const contents = [];

    // Add system prompt
    if (systemPrompt && systemPrompt.trim()) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        const text = msg.parts?.[0]?.text || msg.text;
        const role = msg.role || (msg.isUser || msg.is_user ? 'user' : 'model');
        if (text?.trim()) {
          contents.push({ role, parts: [{ text }] });
        }
      }
    }

    // Add current message with optional image
    const currentParts = [];

    // Add image if provided (for vision understanding)
    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        currentParts.push({
          inlineData: { mimeType: matches[1], data: matches[2] }
        });
      }
    }

    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    // Call AI with automatic Gemini -> Groq fallback
    const result = await callAI(contents, systemPrompt);
    const responseText = result.text;
    console.log(`Response from: ${result.provider}`);

    // Save to database if user is authenticated and chatId provided
    if (req.user && chatId) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addMessage(chatId, req.user.id, message, true, time);
      addMessage(chatId, req.user.id, responseText, false, time);
    }

    res.json({ success: true, response: responseText });

  } catch (error) {
    console.error('AI Error:', error);

    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('429') || errorStr.includes('quota')) {
      return res.status(429).json({
        error: 'rate_limit',
        response: 'Rate limit reached. Please wait and try again.'
      });
    }

    res.status(500).json({
      error: 'server_error',
      response: 'Something went wrong. Please try again.'
    });
  }
});

// ==================== STREAMING CHAT ENDPOINT ====================

app.post('/api/chat/stream', optionalAuth, async (req, res) => {
  try {
    const { message, history, systemPrompt, chatId, image } = req.body;

    console.log('\n=== STREAMING CHAT REQUEST ===');
    console.log('Message:', message);
    console.log('User:', req.user ? req.user.email : 'Guest');
    console.log('==============================\n');

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'No AI API key configured' });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Build contents
    const contents = [];

    if (systemPrompt && systemPrompt.trim()) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        const text = msg.parts?.[0]?.text || msg.text;
        const role = msg.role || (msg.isUser || msg.is_user ? 'user' : 'model');
        if (text?.trim()) {
          contents.push({ role, parts: [{ text }] });
        }
      }
    }

    const currentParts = [];
    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        currentParts.push({
          inlineData: { mimeType: matches[1], data: matches[2] }
        });
      }
    }
    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    // Call AI streaming with Gemini -> Groq fallback
    const result = await callAIStream(contents, systemPrompt);
    console.log(`Streaming from: ${result.provider}`);

    let fullResponse = '';

    if (result.type === 'gemini') {
      // Gemini streaming format
      for await (const chunk of result.stream) {
        const text = chunk.text || '';
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ chunk: text, done: false })}\n\n`);
        }
      }
    } else {
      // Groq streaming format (OpenAI-compatible)
      for await (const chunk of result.stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ chunk: text, done: false })}\n\n`);
        }
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ chunk: '', done: true, fullResponse })}\n\n`);

    // Save to database
    if (req.user && chatId && fullResponse) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addMessage(chatId, req.user.id, message, true, time);
      addMessage(chatId, req.user.id, fullResponse, false, time);
    }

    res.end();

  } catch (error) {
    console.error('Streaming Error:', error);

    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('429') || errorStr.includes('quota')) {
      res.write(`data: ${JSON.stringify({ error: 'Rate limit reached. Please wait and try again.', done: true })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again.', done: true })}\n\n`);
    }
    res.end();
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     AI Chat Backend Server v2.0            ║
╠════════════════════════════════════════════╣
║  Status:    Running                        ║
║  URL:       http://localhost:${PORT}           ║
║  Database:  SQLite ✓                       ║
║  Gemini:    ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'NOT SET ✗'}                ║
║  Groq:      ${process.env.GROQ_API_KEY ? 'Configured ✓' : 'NOT SET ✗'}                ║
╠════════════════════════════════════════════╣
║  Auth Endpoints:                           ║
║  • POST /api/auth/register                 ║
║  • POST /api/auth/login                    ║
║  • GET  /api/auth/profile                  ║
╠════════════════════════════════════════════╣
║  API Endpoints:                            ║
║  • GET/POST /api/assistants                ║
║  • GET/POST /api/chats                     ║
║  • POST /api/chat                          ║
╚════════════════════════════════════════════╝
  `);
});
