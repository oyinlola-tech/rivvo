import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

type NotificationsContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const response = await api.getContactRequestUnreadCount();
    if (response.success && response.data) {
      setUnreadCount(response.data.unreadCount || 0);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const response = await api.markContactRequestsRead();
    if (response.success) {
      await refresh();
      window.dispatchEvent(new CustomEvent("contact_requests_updated"));
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  useEffect(() => {
    const handler = () => {
      refresh();
    };
    window.addEventListener("contact_requests_updated", handler as EventListener);
    return () => window.removeEventListener("contact_requests_updated", handler as EventListener);
  }, [user?.id]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
