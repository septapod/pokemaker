/**
 * Authentication Context
 *
 * Accounts live in the shared Neon `users` table, the same one PokeTracker
 * uses, so one username and password works in both apps.
 *
 * This used to query the users table straight from the browser and run the
 * bcrypt comparison client-side, which meant shipping password hashes to the
 * browser. The check now happens on the server and the browser only ever holds
 * a signed session cookie.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { signIn, signOut, getCurrentUser } from '../services/pokemon-data';

export interface User {
  id: string;
  username: string;
  displayName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  /** True until the first session check finishes, so guards do not flash. */
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'pokemaker_user';

function readCachedUser(): User | null {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Rendered immediately so a returning user does not see a login flash. The
  // cookie, checked just below, is the real authority.
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((session) => {
        if (cancelled) return;
        if (session) {
          const info: User = {
            id: session.id,
            username: session.username ?? '',
            displayName: session.firstName || session.username || '',
          };
          setUser(info);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(info));
          } catch {
            // A browser refusing storage is not a reason to fail the session.
          }
        } else {
          setUser(null);
          try {
            localStorage.removeItem(CACHE_KEY);
          } catch { /* ignore */ }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const session = await signIn(username, password);
      const info: User = {
        id: session.id,
        username: session.username ?? username,
        displayName: session.firstName || session.username || username,
      };
      setUser(info);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(info));
      } catch { /* ignore */ }
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('pokemaker_auth');
    } catch { /* ignore */ }
    void signOut().catch(() => { /* the cookie expires on its own */ });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: user !== null, user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
