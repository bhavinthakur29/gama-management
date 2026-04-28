import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/axios';

type StoredUser = {
  id?: string;
  email?: string;
  role?: string;
  branch_id?: string | number;
  [key: string]: unknown;
};

export type InstructorSession = {
  profile_id: string;
  name: string;
  role: string;
  branch_id: number;
  started_at: string;
  expires_at: string;
};

type LoginOptions = {
  keepLoggedIn?: boolean;
};

type AuthContextValue = {
  token: string | null;
  user: StoredUser | null;
  instructor: InstructorSession | null;
  branchId: string | null;
  isAuthLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  isInstructorActive: boolean;
  login: (email: string, password: string, options?: LoginOptions) => Promise<StoredUser | null>;
  setInstructor: (instructor: InstructorSession | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser() {
  const storedUser = localStorage.getItem('gama_user');
  const storedRole = localStorage.getItem('gama_role');
  const storedBranchId = localStorage.getItem('gama_branch_id');

  if (!storedUser) {
    if (storedRole || storedBranchId) {
      return {
        role: storedRole ?? undefined,
        branch_id: storedBranchId ?? undefined,
      };
    }

    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser) as StoredUser;

    return {
      ...parsedUser,
      role: parsedUser.role ?? storedRole ?? undefined,
      branch_id: parsedUser.branch_id ?? storedBranchId ?? undefined,
    };
  } catch {
    localStorage.removeItem('gama_user');
    return null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem('gama_token');
  localStorage.removeItem('gama_refresh_token');
  localStorage.removeItem('gama_token_expires_at');
  localStorage.removeItem('gama_branch_id');
  localStorage.removeItem('gama_role');
  localStorage.removeItem('gama_user');
  localStorage.removeItem('gama_instructor_session');
}

function getStoredBranchId(user: StoredUser | null) {
  const storedBranchId = localStorage.getItem('gama_branch_id');
  const userBranchId = user?.branch_id;

  if (storedBranchId) {
    return storedBranchId;
  }

  if (userBranchId) {
    const recoveredBranchId = String(userBranchId);
    localStorage.setItem('gama_branch_id', recoveredBranchId);
    return recoveredBranchId;
  }

  return null;
}

function isActiveSession(expiresAt: unknown) {
  return typeof expiresAt === 'string' && Date.parse(expiresAt) > Date.now();
}

function getStoredInstructor() {
  const storedInstructor = localStorage.getItem('gama_instructor_session');

  if (!storedInstructor) {
    return null;
  }

  try {
    const instructor = JSON.parse(storedInstructor) as InstructorSession;

    if (!isActiveSession(instructor.expires_at)) {
      localStorage.removeItem('gama_instructor_session');
      return null;
    }

    return instructor;
  } catch {
    localStorage.removeItem('gama_instructor_session');
    return null;
  }
}

function getBranchIdFromLogin(data: Record<string, any>) {
  return (
    data.branch_id ??
    data.profile?.branch_id ??
    data.user?.branch_id ??
    data.user?.user_metadata?.branch_id ??
    data.user?.app_metadata?.branch_id ??
    null
  );
}

async function resolveBranchId(loginData: Record<string, any>, token: string) {
  const directBranchId = getBranchIdFromLogin(loginData);

  if (directBranchId) {
    return directBranchId;
  }

  const profilesResponse = await api.get('/auth/profiles', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return profilesResponse.data?.profiles?.[0]?.branch_id ?? null;
}

function getRoleFromLogin(data: Record<string, any>) {
  return (
    data.role ??
    data.profile?.role ??
    data.user?.role ??
    data.user?.user_metadata?.role ??
    data.user?.app_metadata?.role ??
    null
  );
}

function normalizeRole(role: unknown) {
  return typeof role === 'string' ? role.replace('-', '_').toLowerCase() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gama_token'));
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());
  const [instructor, setInstructorState] = useState<InstructorSession | null>(() => getStoredInstructor());
  const [branchId, setBranchId] = useState<string | null>(() => getStoredBranchId(getStoredUser()));
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const setInstructor = useCallback((nextInstructor: InstructorSession | null) => {
    if (nextInstructor && isActiveSession(nextInstructor.expires_at)) {
      localStorage.setItem('gama_instructor_session', JSON.stringify(nextInstructor));
      setInstructorState(nextInstructor);
      return;
    }

    localStorage.removeItem('gama_instructor_session');
    setInstructorState(null);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setInstructorState(null);
    setBranchId(null);
    setIsAuthLoading(false);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const expiresAt = localStorage.getItem('gama_token_expires_at');

    if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
      clearStoredAuth();
      setToken(null);
      setUser(null);
      setInstructorState(null);
      setBranchId(null);
      setIsAuthLoading(false);
      setIsInitialized(true);
      return;
    }

    const storedUser = getStoredUser();
    const recoveredBranchId = getStoredBranchId(storedUser);

    setToken(localStorage.getItem('gama_token'));
    setUser(storedUser);
    setInstructorState(getStoredInstructor());
    setBranchId(recoveredBranchId);
    setIsAuthLoading(false);
    setIsInitialized(true);
  }, []);

  const login = useCallback(async (email: string, password: string, options: LoginOptions = {}) => {
    const response = await api.post('/auth/login', { email, password });
    const loginData = response.data;
    const accessToken = loginData.access_token;

    if (!accessToken) {
      throw new Error('Login succeeded but no token was returned.');
    }

    const nextRole = getRoleFromLogin(loginData);
    const nextBranchId = normalizeRole(nextRole) === 'super_admin'
      ? getBranchIdFromLogin(loginData)
      : await resolveBranchId(loginData, accessToken);
    const nextUser: StoredUser = {
      ...loginData.user,
      role: nextRole ?? loginData.user?.role,
      branch_id: nextBranchId ?? loginData.user?.branch_id,
    };
    const expiresAt = options.keepLoggedIn
      ? loginData.expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    localStorage.setItem('gama_token', accessToken);
    localStorage.setItem('gama_token_expires_at', expiresAt);
    localStorage.setItem('gama_user', JSON.stringify(nextUser));

    if (loginData.refresh_token && options.keepLoggedIn) {
      localStorage.setItem('gama_refresh_token', loginData.refresh_token);
    } else {
      localStorage.removeItem('gama_refresh_token');
    }

    if (nextBranchId) {
      localStorage.setItem('gama_branch_id', String(nextBranchId));
    } else {
      localStorage.removeItem('gama_branch_id');
    }

    if (nextRole) {
      localStorage.setItem('gama_role', nextRole);
    }

    setInstructor(null);
    setToken(accessToken);
    setUser(nextUser);
    setBranchId(nextBranchId ? String(nextBranchId) : null);
    setIsAuthLoading(false);
    setIsInitialized(true);

    return nextUser;
  }, [setInstructor]);

  const value = useMemo(
    () => ({
      token,
      user,
      instructor,
      branchId,
      isAuthLoading,
      isInitialized,
      isAuthenticated: Boolean(token),
      isInstructorActive: Boolean(instructor && isActiveSession(instructor.expires_at)),
      login,
      setInstructor,
      logout,
    }),
    [token, user, instructor, branchId, isAuthLoading, isInitialized, login, logout, setInstructor],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
