import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthContextValue = {
  isInitialized: boolean;
  token: string | null;
  user: User | null;
  userId: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
