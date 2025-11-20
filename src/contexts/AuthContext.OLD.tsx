/**
 * Authentication Context
 *
 * This manages the login state for the app.
 * It stores whether the user is logged in and provides login/logout functions.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

// Simple credentials (hardcoded for this single-user app)
const VALID_USERNAME = 'aza';
const VALID_PASSWORD = 'aza';

// Define what the context provides
interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
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

  // Login function - checks credentials and stores auth state
  const login = (username: string, password: string): boolean => {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('pokemaker_auth', 'true');
      return true;
    }
    return false;
  };

  // Logout function - clears auth state
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pokemaker_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
