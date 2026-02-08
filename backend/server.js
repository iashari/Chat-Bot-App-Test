const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');
const Groq = require('groq-sdk');
const schedule = require('node-schedule');
const { Expo } = require('expo-server-sdk');
require('dotenv').config();

// Initialize Expo push notification client
const expo = new Expo();

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
  clearChatMessages,
  // Stats
  getUserStats,
  // Digest
  getDigestSettings,
  createDigestSettings,
  updateDigestSettings,
  createDigest,
  getDigestById: getDigestByIdDb,
  getUserDigests,
  markDigestRead,
  getUnreadDigestCount,
  deleteDigest: deleteDigestDb,
  toggleBookmark,
  getEnabledDigestUsers,
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || null;

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
 * Supports image data via vision-compatible format
 */
const contentsToMessages = (contents, systemPrompt) => {
  const messages = [];
  let hasImages = false;
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  for (const item of contents) {
    const role = item.role === 'model' ? 'assistant' : 'user';
    const contentParts = [];
    for (const part of (item.parts || [])) {
      if (part.text) {
        contentParts.push({ type: 'text', text: part.text });
      } else if (part.inlineData) {
        hasImages = true;
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
        });
      }
    }
    if (contentParts.length > 0) {
      // Use simple string for text-only, array for multimodal
      if (contentParts.length === 1 && contentParts[0].type === 'text') {
        messages.push({ role, content: contentParts[0].text });
      } else {
        messages.push({ role, content: contentParts });
      }
    }
  }
  return { messages, hasImages };
};

/**
 * Call Groq API (fallback provider)
 * Uses vision model automatically when images are present
 */
const callGroq = async (contents, systemPrompt = '') => {
  if (!groq) throw new Error('Groq API key not configured');
  const { messages, hasImages } = contentsToMessages(contents, systemPrompt);
  const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';
  console.log(`Groq model: ${model} (hasImages: ${hasImages})`);
  const response = await groq.chat.completions.create({
    model,
    messages,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
};

/**
 * Call Groq streaming API (fallback provider)
 * Uses vision model automatically when images are present
 */
const callGroqStream = async (contents, systemPrompt = '') => {
  if (!groq) throw new Error('Groq API key not configured');
  const { messages, hasImages } = contentsToMessages(contents, systemPrompt);
  const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';
  console.log(`Groq stream model: ${model} (hasImages: ${hasImages})`);
  const stream = await groq.chat.completions.create({
    model,
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

  // Try Supabase JWT first, then fall back to custom JWT
  if (SUPABASE_JWT_SECRET) {
    jwt.verify(token, SUPABASE_JWT_SECRET, (err, decoded) => {
      if (!err && decoded && decoded.sub) {
        // Supabase JWT: 'sub' field contains the user UUID
        req.user = { id: decoded.sub, email: decoded.email || '' };
        return next();
      }
      // Fall back to custom JWT
      jwt.verify(token, JWT_SECRET, (err2, user) => {
        if (err2) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
      });
    });
  } else {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  }
};

// Optional auth - doesn't fail if no token, just sets req.user to null
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  // Try Supabase JWT first, then custom JWT
  if (SUPABASE_JWT_SECRET) {
    jwt.verify(token, SUPABASE_JWT_SECRET, (err, decoded) => {
      if (!err && decoded && decoded.sub) {
        req.user = { id: decoded.sub, email: decoded.email || '' };
        return next();
      }
      jwt.verify(token, JWT_SECRET, (err2, user) => {
        req.user = err2 ? null : user;
        next();
      });
    });
  } else {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      req.user = err ? null : user;
      next();
    });
  }
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

// Clear all messages in a chat
app.delete('/api/chats/:id/messages', authenticateToken, (req, res) => {
  try {
    const cleared = clearChatMessages(req.params.id, req.user.id);
    if (!cleared) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ success: true, message: 'Messages cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear messages' });
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

    // Add system prompt with memory instruction
    const memoryInstruction = 'You must always remember and reference the full conversation history. When a user refers to something discussed earlier (like an image, topic, or question), use your previous responses as context. If the user previously sent an image and you described it, remember that description in follow-up messages.';
    const fullSystemPrompt = systemPrompt && systemPrompt.trim()
      ? `${systemPrompt}\n\n${memoryInstruction}`
      : memoryInstruction;

    contents.push({ role: 'user', parts: [{ text: fullSystemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions and remember our full conversation context.' }] });

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
      addMessage(chatId, req.user.id, message, true, time, image || null);
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

    const streamMemoryInstruction = 'You must always remember and reference the full conversation history. When a user refers to something discussed earlier (like an image, topic, or question), use your previous responses as context. If the user previously sent an image and you described it, remember that description in follow-up messages.';
    const streamFullPrompt = systemPrompt && systemPrompt.trim()
      ? `${systemPrompt}\n\n${streamMemoryInstruction}`
      : streamMemoryInstruction;

    contents.push({ role: 'user', parts: [{ text: streamFullPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions and remember our full conversation context.' }] });

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
      addMessage(chatId, req.user.id, message, true, time, image || null);
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

// ==================== DIGEST GENERATION (GEMINI + GOOGLE GROUNDING) ====================

const generateDigest = async (topics = ['Technology', 'Science'], customPrompt = '', language = 'English') => {
  if (!ai) throw new Error('Gemini API key not configured for digest generation');

  const topicList = topics.join(', ');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const languageInstruction = language && language !== 'English' ? `\n\nIMPORTANT: Write the entire digest in ${language} language.` : '';

  const prompt = customPrompt
    ? `${customPrompt}\n\nTopics: ${topicList}\nDate: ${today}\n\nProvide a comprehensive news digest with the latest headlines and summaries. Format with clear headings, bullet points, and key takeaways. Include source references.${languageInstruction}`
    : `Create a Daily AI News Digest for ${today}.\n\nTopics: ${topicList}\n\nProvide:\n1. A catchy title for today's digest\n2. 4-6 latest news stories with summaries for each topic\n3. Key takeaways and trends\n4. Format with markdown headings (##), bullet points, and bold text\n5. Keep each story summary to 2-3 sentences\n\nMake it informative, engaging, and well-structured.${languageInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || 'Could not generate digest content.';

    // Extract grounding sources
    let sources = [];
    try {
      const candidate = response.candidates?.[0];
      const groundingMeta = candidate?.groundingMetadata;
      const chunks = groundingMeta?.groundingChunks || [];
      sources = chunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web.title || 'Source',
          url: chunk.web.uri || '',
        }))
        .filter(s => s.url);
    } catch (e) {
      console.log('No grounding sources found:', e.message);
    }

    // Extract title from content (first # heading or first line)
    let title = `Daily Digest - ${today}`;
    const titleMatch = text.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    return { title, content: text, sources, topics };
  } catch (error) {
    console.error('Digest generation error:', error);
    throw error;
  }
};

// ==================== DIGEST ENDPOINTS ====================

// Get digest settings
app.get('/api/digest/settings', authenticateToken, (req, res) => {
  try {
    const settings = getDigestSettings(req.user.id);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get Digest Settings Error:', error);
    res.status(500).json({ error: 'Failed to get digest settings' });
  }
});

// Update digest settings
app.put('/api/digest/settings', authenticateToken, (req, res) => {
  try {
    const settings = updateDigestSettings(req.user.id, req.body);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update Digest Settings Error:', error);
    res.status(500).json({ error: 'Failed to update digest settings' });
  }
});

// Get digest history
app.get('/api/digests', authenticateToken, (req, res) => {
  try {
    const digests = getUserDigests(req.user.id);
    res.json({ success: true, digests });
  } catch (error) {
    console.error('Get Digests Error:', error);
    res.status(500).json({ error: 'Failed to get digests' });
  }
});

// Get unread digest count
app.get('/api/digests/unread/count', authenticateToken, (req, res) => {
  try {
    const count = getUnreadDigestCount(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get single digest (marks as read)
app.get('/api/digests/:id', authenticateToken, (req, res) => {
  try {
    const digest = markDigestRead(req.params.id, req.user.id);
    if (!digest) {
      return res.status(404).json({ error: 'Digest not found' });
    }
    res.json({ success: true, digest });
  } catch (error) {
    console.error('Get Digest Error:', error);
    res.status(500).json({ error: 'Failed to get digest' });
  }
});

// Delete a digest
app.delete('/api/digests/:id', authenticateToken, (req, res) => {
  try {
    const deleted = deleteDigestDb(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Digest not found' });
    }
    res.json({ success: true, message: 'Digest deleted' });
  } catch (error) {
    console.error('Delete Digest Error:', error);
    res.status(500).json({ error: 'Failed to delete digest' });
  }
});

// Toggle bookmark on a digest
app.put('/api/digests/:id/bookmark', authenticateToken, (req, res) => {
  try {
    const digest = toggleBookmark(req.params.id, req.user.id);
    if (!digest) {
      return res.status(404).json({ error: 'Digest not found' });
    }
    res.json({ success: true, digest });
  } catch (error) {
    console.error('Toggle Bookmark Error:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Generate test digest
app.post('/api/digest/test', authenticateToken, async (req, res) => {
  try {
    console.log('\n=== GENERATING TEST DIGEST ===');
    console.log('User:', req.user.email);

    const settings = getDigestSettings(req.user.id);
    const topics = JSON.parse(settings.topics || '["Technology","Science"]');
    const customPrompt = settings.custom_prompt || '';
    const language = settings.language || 'English';

    const result = await generateDigest(topics, customPrompt, language);
    const digest = createDigest(req.user.id, result.title, result.content, result.topics, result.sources);

    console.log('Test digest created:', digest.id);
    console.log('Language:', language);
    console.log('Sources found:', result.sources.length);
    console.log('==============================\n');

    res.json({ success: true, digest });
  } catch (error) {
    console.error('Test Digest Error:', error);
    res.status(500).json({ error: 'Failed to generate test digest: ' + error.message });
  }
});

// Store push token
app.post('/api/push-token', authenticateToken, (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    updateDigestSettings(req.user.id, { push_token: token });
    res.json({ success: true, message: 'Push token saved' });
  } catch (error) {
    console.error('Push Token Error:', error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

// ==================== PUSH NOTIFICATION HELPER ====================

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log('Invalid or missing push token:', pushToken);
    return;
  }

  try {
    const messages = [{
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Push notification sent:', ticketChunk);
    }
  } catch (error) {
    console.error('Push notification error:', error);
  }
};

// ==================== DIGEST SCHEDULER ====================

const startDigestScheduler = () => {
  // Run every hour at minute 0
  schedule.scheduleJob('0 * * * *', async () => {
    console.log('\n=== DIGEST SCHEDULER CHECK ===');
    console.log('Time:', new Date().toISOString());

    try {
      const enabledUsers = getEnabledDigestUsers();
      console.log(`Enabled digest users: ${enabledUsers.length}`);

      for (const userSettings of enabledUsers) {
        try {
          const digestTime = userSettings.digest_time || '08:00';
          const timezone = userSettings.timezone || 'Asia/Jakarta';

          // Get current time in user's timezone
          const now = new Date();
          const userTime = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
          }).format(now);

          // Check if current hour matches digest time
          const currentHour = userTime.split(':')[0];
          const digestHour = digestTime.split(':')[0];

          if (currentHour === digestHour) {
            console.log(`Generating digest for ${userSettings.email} (${timezone})`);
            const topics = JSON.parse(userSettings.topics || '["Technology","Science"]');
            const customPrompt = userSettings.custom_prompt || '';
            const language = userSettings.language || 'English';

            const result = await generateDigest(topics, customPrompt, language);
            const digest = createDigest(userSettings.user_id, result.title, result.content, result.topics, result.sources);
            console.log(`Digest created for ${userSettings.email}`);

            // Send push notification
            if (userSettings.push_token) {
              await sendPushNotification(
                userSettings.push_token,
                'Daily AI Digest',
                result.title,
                { digestId: digest.id, type: 'digest' }
              );
              console.log(`Push notification sent to ${userSettings.email}`);
            }
          }
        } catch (userError) {
          console.error(`Digest error for user ${userSettings.email}:`, userError.message);
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }

    console.log('==============================\n');
  });

  console.log('Digest scheduler started (hourly check)');
};

// ==================== START SERVER ====================

app.listen(PORT, () => {
  // Start digest scheduler
  startDigestScheduler();

  console.log(`
╔════════════════════════════════════════════╗
║     AI Chat Backend Server v2.1            ║
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
╠════════════════════════════════════════════╣
║  Digest Endpoints:                         ║
║  • GET/PUT  /api/digest/settings           ║
║  • GET      /api/digests                   ║
║  • GET      /api/digests/:id               ║
║  • GET      /api/digests/unread/count      ║
║  • POST     /api/digest/test               ║
║  • POST     /api/push-token                ║
╚════════════════════════════════════════════╝
  `);
});
