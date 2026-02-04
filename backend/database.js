// Database setup using SQLite
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database file path
const DB_PATH = path.join(__dirname, 'data', 'chat_app.db');

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ==================== CREATE TABLES ====================

const initDatabase = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      plan TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assistants (AI Personalities) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assistants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Bot',
      icon_color TEXT DEFAULT '#6F00FF',
      description TEXT DEFAULT '',
      system_prompt TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assistant_id TEXT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'MessageSquare',
      icon_color TEXT DEFAULT '#6F00FF',
      system_prompt TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      unread INTEGER DEFAULT 0,
      last_message TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE SET NULL
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      text TEXT NOT NULL,
      is_user INTEGER NOT NULL,
      time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      dark_mode INTEGER DEFAULT 1,
      notifications INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en',
      ai_mode TEXT DEFAULT 'balanced',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Insert default assistants if not exists
  const existingAssistants = db.prepare('SELECT COUNT(*) as count FROM assistants').get();
  if (existingAssistants.count === 0) {
    const defaultAssistants = [
      {
        id: 'general',
        name: 'General Assistant',
        icon: 'Bot',
        icon_color: '#6F00FF',
        description: 'A helpful general-purpose AI assistant',
        system_prompt: 'You are a helpful, friendly AI assistant. Be concise, accurate, and helpful. Match the user\'s language.',
        is_default: 1,
      },
      {
        id: 'coder',
        name: 'Code Helper',
        icon: 'Code2',
        icon_color: '#10B981',
        description: 'Expert programming assistant',
        system_prompt: 'You are an expert programming assistant. Help with code debugging, writing clean code, explaining concepts, and best practices. Provide code examples when helpful.',
        is_default: 1,
      },
      {
        id: 'creative',
        name: 'Creative Writer',
        icon: 'Palette',
        icon_color: '#F59E0B',
        description: 'Creative writing and content assistant',
        system_prompt: 'You are a creative writing assistant. Help with stories, poems, scripts, and creative content. Be imaginative and engaging.',
        is_default: 1,
      },
      {
        id: 'tutor',
        name: 'Study Tutor',
        icon: 'GraduationCap',
        icon_color: '#3B82F6',
        description: 'Patient and knowledgeable tutor',
        system_prompt: 'You are a patient and knowledgeable tutor. Explain concepts clearly, break down complex topics, and use examples and analogies.',
        is_default: 1,
      },
      {
        id: 'analyst',
        name: 'Data Analyst',
        icon: 'BarChart3',
        icon_color: '#EC4899',
        description: 'Data analysis expert',
        system_prompt: 'You are a data analysis expert. Help analyze data, explain statistics, suggest visualizations, and provide insights.',
        is_default: 1,
      },
    ];

    const insertAssistant = db.prepare(`
      INSERT INTO assistants (id, name, icon, icon_color, description, system_prompt, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const assistant of defaultAssistants) {
      insertAssistant.run(
        assistant.id,
        assistant.name,
        assistant.icon,
        assistant.icon_color,
        assistant.description,
        assistant.system_prompt,
        assistant.is_default
      );
    }
    console.log('✓ Default assistants created');
  }

  console.log('✓ Database initialized successfully');
};

// ==================== USER FUNCTIONS ====================

const createUser = (email, password, name) => {
  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, email.toLowerCase(), hashedPassword, name);

    // Create default settings for user
    const settingsStmt = db.prepare(`
      INSERT INTO user_settings (id, user_id)
      VALUES (?, ?)
    `);
    settingsStmt.run(uuidv4(), id);

    return { id, email: email.toLowerCase(), name };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

const findUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
};

const findUserById = (id) => {
  const stmt = db.prepare('SELECT id, email, name, avatar, phone, plan, created_at FROM users WHERE id = ?');
  return stmt.get(id);
};

const updateUser = (id, updates) => {
  const allowedFields = ['name', 'avatar', 'phone'];
  const updateFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updateFields.length === 0) return null;

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return findUserById(id);
};

const verifyPassword = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
};

// ==================== USER SETTINGS FUNCTIONS ====================

const getUserSettings = (userId) => {
  const stmt = db.prepare('SELECT * FROM user_settings WHERE user_id = ?');
  return stmt.get(userId);
};

const updateUserSettings = (userId, settings) => {
  const allowedFields = ['dark_mode', 'notifications', 'language', 'ai_mode'];
  const updateFields = [];
  const values = [];

  for (const [key, value] of Object.entries(settings)) {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updateFields.length === 0) return null;

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  const stmt = db.prepare(`UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = ?`);
  stmt.run(...values);

  return getUserSettings(userId);
};

// ==================== ASSISTANT FUNCTIONS ====================

const getAllAssistants = () => {
  const stmt = db.prepare('SELECT * FROM assistants ORDER BY is_default DESC, created_at ASC');
  return stmt.all();
};

const getAssistantById = (id) => {
  const stmt = db.prepare('SELECT * FROM assistants WHERE id = ?');
  return stmt.get(id);
};

const createAssistant = (data) => {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO assistants (id, name, icon, icon_color, description, system_prompt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.name, data.icon || 'Bot', data.icon_color || '#6F00FF', data.description || '', data.system_prompt);
  return getAssistantById(id);
};

// ==================== CHAT FUNCTIONS ====================

const getUserChats = (userId) => {
  const stmt = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
    FROM chats c
    WHERE c.user_id = ?
    ORDER BY c.is_pinned DESC, c.updated_at DESC
  `);
  return stmt.all(userId);
};

const getChatById = (chatId, userId) => {
  const stmt = db.prepare('SELECT * FROM chats WHERE id = ? AND user_id = ?');
  return stmt.get(chatId, userId);
};

const createChat = (userId, data) => {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO chats (id, user_id, assistant_id, name, icon, icon_color, system_prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    userId,
    data.assistant_id || null,
    data.name || 'New Chat',
    data.icon || 'MessageSquare',
    data.icon_color || '#6F00FF',
    data.system_prompt || ''
  );
  return getChatById(id, userId);
};

const updateChat = (chatId, userId, updates) => {
  const chat = getChatById(chatId, userId);
  if (!chat) return null;

  const allowedFields = ['name', 'is_pinned', 'unread', 'last_message'];
  const updateFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      // Convert isPinned to is_pinned for database
      const dbKey = key === 'isPinned' ? 'is_pinned' : key;
      updateFields.push(`${dbKey} = ?`);
      values.push(value);
    }
  }

  if (updateFields.length === 0) return chat;

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(chatId);
  values.push(userId);

  const stmt = db.prepare(`UPDATE chats SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`);
  stmt.run(...values);

  return getChatById(chatId, userId);
};

const deleteChat = (chatId, userId) => {
  const stmt = db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?');
  const result = stmt.run(chatId, userId);
  return result.changes > 0;
};

// ==================== MESSAGE FUNCTIONS ====================

const getChatMessages = (chatId, userId) => {
  // Verify chat belongs to user
  const chat = getChatById(chatId, userId);
  if (!chat) return [];

  const stmt = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC');
  return stmt.all(chatId);
};

const addMessage = (chatId, userId, text, isUser, time) => {
  // Verify chat belongs to user
  const chat = getChatById(chatId, userId);
  if (!chat) return null;

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO messages (id, chat_id, text, is_user, time)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, chatId, text, isUser ? 1 : 0, time);

  // Update chat's last message and timestamp
  const updateStmt = db.prepare(`
    UPDATE chats SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  updateStmt.run(text.substring(0, 100), chatId);

  return { id, chat_id: chatId, text, is_user: isUser, time };
};

// ==================== STATS FUNCTIONS ====================

const getUserStats = (userId) => {
  const chatCount = db.prepare('SELECT COUNT(*) as count FROM chats WHERE user_id = ?').get(userId);
  const messageCount = db.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN chats c ON m.chat_id = c.id
    WHERE c.user_id = ?
  `).get(userId);

  return {
    chats: chatCount.count,
    messages: messageCount.count,
  };
};

module.exports = {
  db,
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
};
