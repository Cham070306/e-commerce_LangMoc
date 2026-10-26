import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, LoginPayload, RegisterPayload } from '../../lib/types';
import { api, ApiError } from '../../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Khôi phục phiên đăng nhập khi mở / tải lại trang
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.data);
    } catch (err) {
      // 401 hoặc lỗi mạng nghĩa là chưa đăng nhập hoặc phiên hết hạn
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (payload: LoginPayload): Promise<User> => {
    const res = await api.login(payload);
    setUser(res.data);
    return res.data;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await api.register(payload);
    setUser(res.data);
    return res.data;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Dù API lỗi thì phía client vẫn làm rỗng session
    } finally {
      setUser(null);
      // Điều hướng về trang chủ
      window.location.hash = '#/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
