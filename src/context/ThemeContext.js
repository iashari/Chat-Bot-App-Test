import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

// Light theme - Clean modern style inspired by Gemini
export const lightTheme = {
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  accent: '#ec4899',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  userBubble: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  userBubbleColor: '#8b5cf6',
  userBubbleText: '#ffffff',
  aiBubble: '#ffffff',
  aiBubbleText: '#1f2937',
  inputBackground: '#ffffff',
  inputBorder: '#e5e7eb',
  headerBackground: '#ffffff',
  tabBarBackground: '#ffffff',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  gradient: ['#f8f9fa', '#f3f4f6'],
};

// Dark theme - DeepAI inspired purple/dark theme
export const darkTheme = {
  background: '#0a061d',
  surface: '#151026',
  surfaceElevated: '#1e1638',
  primary: '#8F37FF',
  primaryLight: '#a855f7',
  accent: '#c764ec',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: 'rgba(255, 255, 255, 0.13)',
  userBubble: 'linear-gradient(135deg, #8F37FF 0%, #6366f1 100%)',
  userBubbleColor: '#8F37FF',
  userBubbleText: '#ffffff',
  aiBubble: 'rgba(21, 16, 38, 1)',
  aiBubbleColor: '#1e1638',
  aiBubbleText: '#f9fafb',
  inputBackground: '#151026',
  inputBorder: 'rgba(255, 255, 255, 0.13)',
  headerBackground: '#0a061d',
  tabBarBackground: '#0a061d',
  cardShadow: 'rgba(143, 55, 255, 0.1)',
  gradient: ['#170a2d', '#0a061d'],
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
