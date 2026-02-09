import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch profile from Supabase profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    }
  };

  // Set user data from session
  const setSessionUser = async (session) => {
    if (session?.user) {
      const profileData = await fetchProfile(session.user.id);
      const userData = {
        id: session.user.id,
        email: session.user.email,
        name: profileData?.full_name || session.user.user_metadata?.full_name || 'User',
        avatar: profileData?.avatar_url || session.user.user_metadata?.avatar_url || null,
      };
      setUser(userData);
      setProfile(profileData);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    let subscription;

    const init = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        await setSessionUser(session);
      } catch (error) {
        console.error('Session restore error:', error);
      } finally {
        setIsLoading(false);
      }

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          await setSessionUser(session);
        }
      );
      subscription = data.subscription;
    };

    init();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Login with email/password
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Map Supabase errors to user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Incorrect email or password. Please try again.', code: 'INVALID_CREDENTIALS' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Register with email/password
  const register = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Google sign-in using ID token
  const signInWithGoogle = async (idToken) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, user: data.user };
    } catch (error) {
      console.warn('Google sign-in error:', error);
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  };

  // Magic Link login (Bonus)
  const signInWithMagicLink = async (email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) return { success: false, error: error.message };
      return { success: true, message: 'Check your email for the magic link!' };
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, error: 'Failed to send magic link. Please try again.' };
    }
  };

  // Update user data locally
  const updateUserData = (newData) => {
    setUser(prev => ({ ...prev, ...newData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        signInWithGoogle,
        signInWithMagicLink,
        updateUserData,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
