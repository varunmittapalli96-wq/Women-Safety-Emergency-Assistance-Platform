'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  setAuthToken: (token: string) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe().then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await api.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const register = async (data: Record<string, unknown>) => {
    const { user, token } = await api.register(data);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const setAuthToken = async (token: string): Promise<User> => {
    localStorage.setItem('token', token);
    const userData = await api.getMe();
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = async (credential: string): Promise<User> => {
    const { user, token } = await api.googleLogin(credential);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, setAuthToken, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
