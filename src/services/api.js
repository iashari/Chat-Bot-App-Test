// API Service for AI Chat App with Authentication
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3001';

// Token management
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Store token persistently
export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem('auth_token', token);
    authToken = token;
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Load token from storage
export const loadToken = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      authToken = token;
    }
    return token;
  } catch (error) {
    console.error('Error loading token:', error);
    return null;
  }
};

// Clear token (logout)
export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem('auth_token');
    authToken = null;
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

// Get auth headers
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

// ==================== AUTH FUNCTIONS ====================

/**
 * Register a new user
 * @param {string} email
 * @param {string} password
 * @param {string} name
 */
export const register = async (email, password, name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    // Save token
    if (data.token) {
      await saveToken(data.token);
    }

    return { success: true, user: data.user, token: data.token };
  } catch (error) {
    console.error('Register Error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
};

/**
 * Login user
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed', code: data.code };
    }

    // Save token
    if (data.token) {
      await saveToken(data.token);
    }

    return { success: true, user: data.user, token: data.token };
  } catch (error) {
    console.error('Login Error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  await clearToken();
  return { success: true };
};

/**
 * Get current user profile
 */
export const getProfile = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await clearToken();
      }
      return { success: false, error: data.error || 'Failed to get profile' };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Get Profile Error:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update profile' };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Update Profile Error:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Update user settings
 */
export const updateSettings = async (settings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update settings' };
    }

    return { success: true, settings: data.settings };
  } catch (error) {
    console.error('Update Settings Error:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!authToken;
};

// ==================== CHAT FUNCTIONS ====================

/**
 * Send a message to the Gemini AI
 */
export const sendMessage = async (message, history = [], systemPrompt = '', chatId = null) => {
  try {
    console.log('Sending to:', API_BASE_URL + '/api/chat');
    console.log('SystemPrompt:', systemPrompt ? 'YES' : 'NO');

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message,
        history: history.map(msg => ({
          role: msg.isUser || msg.is_user ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
        systemPrompt,
        chatId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        return {
          response: null,
          error: data.response || 'Rate limit reached. Please wait a moment and try again.'
        };
      }
      throw new Error(data.error || data.response || `HTTP error! status: ${response.status}`);
    }

    return { response: data.response };
  } catch (error) {
    console.error('API Error:', error);

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        response: null,
        error: 'Connection error. Please check your internet.'
      };
    }

    return {
      response: null,
      error: error.message || 'Failed to connect to AI. Please try again.'
    };
  }
};

/**
 * Send a message with an image
 */
export const sendMessageWithImage = async (message, imageBase64, history = [], systemPrompt = '', chatId = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message,
        image: imageBase64,
        systemPrompt,
        chatId,
        history: history.map(msg => ({
          role: msg.isUser || msg.is_user ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.response || `HTTP error! status: ${response.status}`);
    }

    return { response: data.response };
  } catch (error) {
    console.error('API Error:', error);
    return {
      response: null,
      error: error.message || 'Failed to connect to AI. Please try again.'
    };
  }
};

/**
 * Send a message with streaming response
 * @param {string} message - The message to send
 * @param {Array} history - Chat history
 * @param {string} systemPrompt - System prompt
 * @param {string} chatId - Chat ID
 * @param {Function} onChunk - Callback for each chunk received
 * @param {string} imageBase64 - Optional base64 image
 */
export const sendMessageStream = async (message, history = [], systemPrompt = '', chatId = null, onChunk, imageBase64 = null) => {
  try {
    console.log('Streaming to:', API_BASE_URL + '/api/chat/stream');

    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message,
        image: imageBase64,
        systemPrompt,
        chatId,
        history: history.map(msg => ({
          role: msg.isUser || msg.is_user ? 'user' : 'model',
          parts: [{ text: msg.text }],
        })),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              return { response: null, error: data.error };
            }
            if (data.chunk) {
              fullResponse += data.chunk;
              if (onChunk) onChunk(data.chunk, fullResponse);
            }
            if (data.done) {
              return { response: fullResponse || data.fullResponse };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return { response: fullResponse };
  } catch (error) {
    console.error('Streaming API Error:', error);
    return {
      response: null,
      error: error.message || 'Failed to connect to AI. Please try again.'
    };
  }
};

// ==================== CHAT CRUD OPERATIONS ====================

/**
 * Get all chats from backend
 */
export const getChats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      headers: getHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return { chats: [], error: 'Please login to view chats' };
      }
      throw new Error(data.error || 'Failed to load chats');
    }

    return { chats: data.chats || [] };
  } catch (error) {
    console.error('Get Chats Error:', error);
    return { chats: [], error: error.message };
  }
};

/**
 * Get a single chat with messages
 */
export const getChatById = async (chatId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      headers: getHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.error('Get Chat Error:', error);
    return { chat: null, error: error.message };
  }
};

/**
 * Create a new chat
 */
export const createChat = async (name, systemPrompt = '', icon = 'MessageSquare', iconColor = '#6F00FF') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, systemPrompt, icon, iconColor }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.error('Create Chat Error:', error);
    return { chat: null, error: error.message };
  }
};

/**
 * Delete a chat
 */
export const deleteChat = async (chatId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete chat');
    }

    return { success: true };
  } catch (error) {
    console.error('Delete Chat Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a chat
 */
export const updateChat = async (chatId, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.error('Update Chat Error:', error);
    return { chat: null, error: error.message };
  }
};

/**
 * Get all assistants (templates)
 */
export const getAssistants = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assistants`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load assistants');
    }

    return { assistants: data.assistants || [] };
  } catch (error) {
    console.error('Get Assistants Error:', error);
    return { assistants: [], error: error.message };
  }
};

export default {
  // Auth
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  updateSettings,
  isAuthenticated,
  loadToken,
  saveToken,
  clearToken,
  setAuthToken,
  getAuthToken,
  // Chat
  sendMessage,
  sendMessageWithImage,
  sendMessageStream,
  getChats,
  getChatById,
  createChat,
  deleteChat,
  updateChat,
  getAssistants,
};
