import { apiRequest, resolveAssetUrl } from './config';

export type NotificationType = 'message' | 'call' | 'status' | 'system' | 'marketing';

export interface NotificationSender {
  id: string;
  name: string;
  avatar?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  actionUrl?: string;
  sender?: NotificationSender;
  data?: Record<string, string>;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  messages: boolean;
  calls: boolean;
  status: boolean;
  system: boolean;
  marketing: boolean;
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface DeviceRegistration {
  deviceId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
}

export const notificationsApi = {
  async getNotifications(limit = 20, offset = 0, unreadOnly = false): Promise<NotificationItem[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unreadOnly: String(unreadOnly),
    });
    const items = await apiRequest<NotificationItem[]>(`/notifications?${params}`);
    return items.map((item) => ({
      ...item,
      sender: item.sender
        ? { ...item.sender, avatar: resolveAssetUrl(item.sender.avatar) || undefined }
        : undefined,
    }));
  },

  async markAsRead(notificationId: string): Promise<void> {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async markAllAsRead(): Promise<void> {
    return apiRequest('/notifications/read-all', {
      method: 'POST',
    });
  },

  async deleteNotification(notificationId: string): Promise<void> {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  async getPreferences(): Promise<NotificationPreferences> {
    return apiRequest<NotificationPreferences>('/notifications/preferences');
  },

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return apiRequest<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  },

  async registerDevice(token: string, platform: DeviceRegistration['platform'], deviceId?: string): Promise<DeviceRegistration> {
    return apiRequest<DeviceRegistration>('/notifications/devices', {
      method: 'POST',
      body: JSON.stringify({ token, platform, deviceId }),
    });
  },

  async unregisterDevice(deviceId: string): Promise<void> {
    return apiRequest(`/notifications/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },
};
