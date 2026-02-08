// API Service for AI Chat App with Supabase Auth
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'http://192.168.1.60:3001';

// Get auth headers using Supabase session token
const getHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('Error getting session for headers:', error);
  }

  return headers;
};

// ==================== CHAT FUNCTIONS ====================

export const formatHistory = (history) => {
  return history
    .filter(msg => msg.text && msg.text.trim())
    .map(msg => {
      const isUser = msg.isUser || msg.is_user;
      let text = msg.text;
      if (isUser && (msg.hasImage || msg.imageUri)) {
        text = `[User attached an image] ${text}`;
      }
      return {
        role: isUser ? 'user' : 'model',
        parts: [{ text }],
      };
    });
};

export const sendMessage = async (message, history = [], systemPrompt = '', chatId = null) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history: formatHistory(history),
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
    console.warn('API Error:', error);

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

export const sendMessageWithImage = async (message, imageBase64, history = [], systemPrompt = '', chatId = null) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        image: imageBase64,
        systemPrompt,
        chatId,
        history: formatHistory(history),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.response || `HTTP error! status: ${response.status}`);
    }

    return { response: data.response };
  } catch (error) {
    console.warn('API Error:', error);
    return {
      response: null,
      error: error.message || 'Failed to connect to AI. Please try again.'
    };
  }
};

export const sendMessageStream = async (message, history = [], systemPrompt = '', chatId = null, onChunk, imageBase64 = null) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        image: imageBase64,
        systemPrompt,
        chatId,
        history: formatHistory(history),
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
    console.warn('Streaming API Error:', error);
    return {
      response: null,
      error: error.message || 'Failed to connect to AI. Please try again.'
    };
  }
};

// ==================== CHAT CRUD OPERATIONS ====================

export const getChats = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats`, { headers });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return { chats: [], error: 'Please login to view chats' };
      }
      throw new Error(data.error || 'Failed to load chats');
    }

    return { chats: data.chats || [] };
  } catch (error) {
    console.warn('Get Chats:', error.message);
    return { chats: [], error: error.message };
  }
};

export const getChatById = async (chatId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.warn('Get Chat:', error.message);
    return { chat: null, error: error.message };
  }
};

export const createChat = async (name, systemPrompt = '', icon = 'MessageSquare', iconColor = '#6F00FF') => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, systemPrompt, icon, iconColor }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.warn('Create Chat Error:', error);
    return { chat: null, error: error.message };
  }
};

export const deleteChat = async (chatId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete chat');
    }

    return { success: true };
  } catch (error) {
    console.warn('Delete Chat Error:', error);
    return { success: false, error: error.message };
  }
};

export const clearChatMessages = async (chatId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to clear messages');
    }

    return { success: true };
  } catch (error) {
    console.warn('Clear Messages Error:', error);
    return { success: false, error: error.message };
  }
};

export const updateChat = async (chatId, updates) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update chat');
    }

    return { chat: data.chat };
  } catch (error) {
    console.warn('Update Chat Error:', error);
    return { chat: null, error: error.message };
  }
};

export const getAssistants = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assistants`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load assistants');
    }

    return { assistants: data.assistants || [] };
  } catch (error) {
    console.warn('Get Assistants:', error.message);
    return { assistants: [], error: error.message };
  }
};

// ==================== DIGEST FUNCTIONS ====================

export const getDigestSettings = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digest/settings`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get digest settings');
    return { success: true, settings: data.settings };
  } catch (error) {
    console.warn('Get Digest Settings:', error.message);
    return { success: false, error: error.message };
  }
};

export const updateDigestSettings = async (settings) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digest/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update digest settings');
    return { success: true, settings: data.settings };
  } catch (error) {
    console.warn('Update Digest Settings Error:', error);
    return { success: false, error: error.message };
  }
};

export const getDigests = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digests`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get digests');
    return { success: true, digests: data.digests || [] };
  } catch (error) {
    console.warn('Get Digests:', error.message);
    return { success: false, digests: [], error: error.message };
  }
};

export const getDigestById = async (digestId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digests/${digestId}`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get digest');
    return { success: true, digest: data.digest };
  } catch (error) {
    console.warn('Get Digest:', error.message);
    return { success: false, error: error.message };
  }
};

export const getUnreadDigestCount = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digests/unread/count`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get unread count');
    return { success: true, count: data.count };
  } catch (error) {
    console.warn('Get Unread Count:', error.message);
    return { success: false, count: 0, error: error.message };
  }
};

export const deleteDigest = async (digestId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digests/${digestId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete digest');
    return { success: true };
  } catch (error) {
    console.warn('Delete Digest Error:', error);
    return { success: false, error: error.message };
  }
};

export const toggleBookmarkDigest = async (digestId) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digests/${digestId}/bookmark`, {
      method: 'PUT',
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to toggle bookmark');
    return { success: true, digest: data.digest };
  } catch (error) {
    console.warn('Toggle Bookmark Error:', error);
    return { success: false, error: error.message };
  }
};

export const triggerTestDigest = async () => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/digest/test`, {
      method: 'POST',
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate test digest');
    return { success: true, digest: data.digest };
  } catch (error) {
    console.warn('Test Digest Error:', error);
    return { success: false, error: error.message };
  }
};

export const savePushToken = async (token) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to save push token');
    return { success: true };
  } catch (error) {
    console.warn('Save Push Token Error:', error);
    return { success: false, error: error.message };
  }
};

export default {
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
  // Digest
  getDigestSettings,
  updateDigestSettings,
  getDigests,
  getDigestById,
  getUnreadDigestCount,
  deleteDigest,
  toggleBookmarkDigest,
  triggerTestDigest,
  savePushToken,
};
