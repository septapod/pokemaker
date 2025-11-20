/**
 * Authentication Context
 *
 * This manages the login state for the app using the users table.
 * It stores whether the user is logged in and provides login/logout functions.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';

// User information
export interface User {
  id: string;
  username: string;
  displayName: string;
}

// Define what the context provides
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps the app
export function AuthProvider({ children }: { children: ReactNode }) {
  // Check localStorage to see if user was previously logged in
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('pokemaker_auth') === 'true';
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('pokemaker_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Login function - checks credentials against users table
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Query users table for username
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, password_hash, display_name')
        .eq('username', username)
        .single();

      if (error || !userData) {
        console.error('User not found:', error);
        return false;
      }

      // Verify password using bcrypt
      const passwordMatch = bcrypt.compareSync(password, userData.password_hash);

      if (!passwordMatch) {
        console.error('Invalid password');
        return false;
      }

      // Set authenticated state
      const userInfo: User = {
        id: userData.id,
        username: userData.username,
        displayName: userData.display_name || userData.username,
      };

      setIsAuthenticated(true);
      setUser(userInfo);
      localStorage.setItem('pokemaker_auth', 'true');
      localStorage.setItem('pokemaker_user', JSON.stringify(userInfo));

      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  // Logout function - clears auth state
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('pokemaker_auth');
    localStorage.removeItem('pokemaker_user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
