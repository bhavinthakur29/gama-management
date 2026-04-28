import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';
import { AuthContext, type AuthContextValue } from './auth-context';
import { clearStoredAuth, getInitialAuthState } from './auth-storage';

const SUPER_ADMIN_EMAIL = 'bhavinthakuruk@gmail.com';

function persistSession(accessToken: string, user: User, expiresAt?: number) {
  localStorage.setItem('gama_token', accessToken);
  localStorage.setItem('gama_auth_user_id', user.id);

  if (expiresAt) {
    localStorage.setItem('gama_token_expires_at', new Date(expiresAt * 1000).toISOString());
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuthState = useMemo(() => getInitialAuthState(), []);
  const [token, setToken] = useState<string | null>(() => initialAuthState.token);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(() => initialAuthState.userId);
  const [isInitialized, setIsInitialized] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw error ?? new Error('Unable to sign in.');
    }

    persistSession(data.session.access_token, data.user, data.session.expires_at);
    setToken(data.session.access_token);
    setUser(data.user);
    setUserId(data.user.id);
  }, []);

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setUserId(null);
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        persistSession(session.access_token, session.user, session.expires_at);
        setToken(session.access_token);
        setUser(session.user);
        setUserId(session.user.id);
      } else {
        clearStoredAuth();
        setToken(null);
        setUser(null);
        setUserId(null);
      }

      setIsInitialized(true);
    };

    queueMicrotask(() => void hydrate());

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        persistSession(session.access_token, session.user, session.expires_at);
        setToken(session.access_token);
        setUser(session.user);
        setUserId(session.user.id);
      } else {
        clearStoredAuth();
        setToken(null);
        setUser(null);
        setUserId(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isInitialized,
    token,
    user,
    userId,
    userEmail: user?.email ?? null,
    isAuthenticated: Boolean(token && userId),
    isSuperAdmin: (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL,
    login,
    logout,
  }), [isInitialized, login, logout, token, user, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
