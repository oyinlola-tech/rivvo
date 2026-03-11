import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";
import { getOrCreateKeyPair } from "../lib/crypto";

interface User {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  isModerator: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.setAuthErrorHandler(() => {
      api.setToken(null);
      api.setRefreshToken(null);
      setUser(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      window.location.assign("/auth/login");
    });
    return () => api.setAuthErrorHandler(null);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        const response = await api.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success && response.data) {
      api.setToken(response.data.token);
      api.setRefreshToken(response.data.refreshToken);
      setUser(response.data.user);
      const keyPair = await getOrCreateKeyPair();
      await api.setPublicKey(JSON.stringify(keyPair.publicKey));
      return { success: true };
    }
    return { success: false, message: response.error || "Login failed" };
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await api.signup(email, password, name);
    if (response.success) {
      return { success: true };
    }
    return { success: false, message: response.error || "Signup failed" };
  };

  const verifyOTP = async (email: string, otp: string) => {
    const response = await api.verifyOTP(email, otp);
    if (response.success && response.data) {
      api.setToken(response.data.token);
      api.setRefreshToken(response.data.refreshToken);
      setUser(response.data.user);
      const keyPair = await getOrCreateKeyPair();
      await api.setPublicKey(JSON.stringify(keyPair.publicKey));
      return { success: true };
    }
    return { success: false, message: response.error || "OTP verification failed" };
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.logout(refreshToken);
    }
    api.setToken(null);
    api.setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, verifyOTP }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
