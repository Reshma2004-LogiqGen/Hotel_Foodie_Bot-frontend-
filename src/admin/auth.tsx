import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, UNAUTHORIZED_EVENT, adminApi, tokenStore } from './api';
import type { RegisterInput, StaffUser } from './types';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'offline';

interface AuthContextValue {
  user: StaffUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<StaffUser>;
  register: (input: RegisterInput) => Promise<StaffUser>;
  setUser: (user: StaffUser) => void;
  logout: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const KITCHEN_PATH = '/admin/kitchen';

export function homePath(user: StaffUser) {
  return user.role === 'chef' ? KITCHEN_PATH : '/admin/menu';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'checking' : 'anonymous'));

  const verify = useCallback(async () => {
    if (!tokenStore.get()) {
      setStatus('anonymous');
      return;
    }
    setStatus('checking');
    try {
      const { user } = await adminApi.me();
      setUser(user);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus(error instanceof ApiError && error.status === 0 ? 'offline' : 'anonymous');
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const signIn = useCallback((token: string, signedIn: StaffUser) => {
    tokenStore.set(token);
    setUser(signedIn);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await adminApi.login(email, password);
    signIn(token, user);
    return user;
  }, [signIn]);

  const register = useCallback(async (input: RegisterInput) => {
    const { token, user } = await adminApi.register(input);
    signIn(token, user);
    return user;
  }, [signIn]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, setUser, logout, retry: verify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
