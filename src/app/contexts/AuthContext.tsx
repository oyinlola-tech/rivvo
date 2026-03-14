import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { getDeviceId, getOrCreateDeviceKeyPair, getOrCreateKeyPair } from "../lib/crypto";

interface User {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  username?: string | null;
  usernameUpdatedAt?: string | null;
  verified: boolean;
  isVerifiedBadge: boolean;
  verifiedBadgeExpiresAt?: string | null;
  badgeStatus?: "none" | "active" | "expired";
  isModerator: boolean;
  isAdmin: boolean;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  refreshProfile: () => Promise<void>;
  verificationPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutOnExitRef = useRef(false);
  const [verificationPending, setVerificationPending] = useState(false);

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
    const handler = () => {
      if (logoutOnExitRef.current) return;
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return;
      logoutOnExitRef.current = true;
      api.logoutOnExit(refreshToken);
    };

    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, []);

  useEffect(() => {
    const checkVerification = async () => {
      if (!user?.id) return;
      const response = await api.getVerificationStatus();
      if (response.success && response.data?.latestPending) {
        setVerificationPending(true);
        const shownKey = "rivvo_verification_pending_toast";
        if (!sessionStorage.getItem(shownKey)) {
          toast("Verification pending review", {
            description: "Payment received. Admin review in progress.",
          });
          sessionStorage.setItem(shownKey, "1");
        }
      } else if (response.success) {
        setVerificationPending(false);
        const decision = response.data?.latestDecision;
        if (decision?.reviewStatus === "approved") {
          const key = "rivvo_verification_approved_toast";
          if (!sessionStorage.getItem(key)) {
            toast("Verification approved", {
              description: "Your verification badge is now active.",
            });
            sessionStorage.setItem(key, "1");
          }
        }
        if (decision?.reviewStatus === "rejected") {
          const key = "rivvo_verification_rejected_toast";
          if (!sessionStorage.getItem(key)) {
            toast("Verification rejected", {
              description: decision.rejectionReason || "Please review your submission and try again.",
            });
            sessionStorage.setItem(key, "1");
          }
        }
      }
    };
    checkVerification();
  }, [user?.id]);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        const response = await api.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
          const keyPair = await getOrCreateKeyPair();
          await api.setPublicKey(JSON.stringify(keyPair.publicKey));
          const deviceKeyPair = await getOrCreateDeviceKeyPair();
          await api.registerDeviceKey({
            deviceId: getDeviceId(),
            publicKey: JSON.stringify(deviceKeyPair.publicKey),
            deviceName: navigator.userAgent,
          });
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await api.login(identifier, password);
    if (response.success && response.data) {
      api.setToken(response.data.token);
      api.setRefreshToken(response.data.refreshToken ?? null);
      setUser(response.data.user);
      const keyPair = await getOrCreateKeyPair();
      await api.setPublicKey(JSON.stringify(keyPair.publicKey));
      const deviceKeyPair = await getOrCreateDeviceKeyPair();
      await api.registerDeviceKey({
        deviceId: getDeviceId(),
        publicKey: JSON.stringify(deviceKeyPair.publicKey),
        deviceName: navigator.userAgent,
      });
      return { success: true };
    }
    return { success: false, message: response.error || "Login failed" };
  };

  const signup = async (email: string, password: string, name: string, phone: string) => {
    const response = await api.signup(email, password, name, phone);
    if (response.success) {
      return { success: true };
    }
    return { success: false, message: response.error || "Signup failed" };
  };

  const verifyOTP = async (email: string, otp: string) => {
    const response = await api.verifyOTP(email, otp);
    if (response.success && response.data) {
      api.setToken(response.data.token);
      api.setRefreshToken(response.data.refreshToken ?? null);
      setUser(response.data.user);
      const keyPair = await getOrCreateKeyPair();
      await api.setPublicKey(JSON.stringify(keyPair.publicKey));
      const deviceKeyPair = await getOrCreateDeviceKeyPair();
      await api.registerDeviceKey({
        deviceId: getDeviceId(),
        publicKey: JSON.stringify(deviceKeyPair.publicKey),
        deviceName: navigator.userAgent,
      });
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

  const refreshProfile = async () => {
    const response = await api.getProfile();
    if (response.success && response.data) {
      setUser(response.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, verifyOTP, refreshProfile, verificationPending }}
    >
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
