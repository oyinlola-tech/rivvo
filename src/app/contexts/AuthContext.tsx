import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  bio?: string;
  phone?: string | null;
  username?: string | null;
  verified?: boolean;
  isVerifiedBadge?: boolean;
  verifiedBadgeExpiresAt?: string | null;
  usernameUpdatedAt?: string | null;
  badgeStatus?: 'active' | 'expired' | 'none';
  isModerator?: boolean;
  isAdmin?: boolean;
  status?: 'active' | 'suspended';
  createdAt?: string;
  lastSeen?: string;
  role?: 'user' | 'admin' | 'moderator';
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('rivvo_token');
      if (token) {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        localStorage.setItem('rivvo_user_id', userData.id);
        localStorage.setItem('rivvo_user', JSON.stringify(userData));
      }
    } catch (error) {
      localStorage.removeItem('rivvo_token');
      localStorage.removeItem('rivvo_user_id');
      localStorage.removeItem('rivvo_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { user: userData, token, refreshToken } = await authApi.login(email, password);
    localStorage.setItem('rivvo_token', token);
    localStorage.setItem('rivvo_refresh_token', refreshToken);
    localStorage.setItem('rivvo_user_id', userData.id);
    localStorage.setItem('rivvo_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    await authApi.register(email, password, name);
  };

  const verifyOTP = async (email: string, otp: string) => {
    const { user: userData, token, refreshToken } = await authApi.verifyOTP(email, otp);
    localStorage.setItem('rivvo_token', token);
    localStorage.setItem('rivvo_refresh_token', refreshToken);
    localStorage.setItem('rivvo_user_id', userData.id);
    localStorage.setItem('rivvo_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('rivvo_refresh_token') || '';
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
    localStorage.removeItem('rivvo_token');
    localStorage.removeItem('rivvo_refresh_token');
    localStorage.removeItem('rivvo_user_id');
    localStorage.removeItem('rivvo_user');
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    const updatedUser = await authApi.updateProfile(data);
    setUser(updatedUser);
    localStorage.setItem('rivvo_user_id', updatedUser.id);
    localStorage.setItem('rivvo_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOTP,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
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
