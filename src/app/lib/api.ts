// API configuration and utilities
// Replace with your actual backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiUser {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  verified: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  avatar?: string | null;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: ApiUser;
}

export interface ConversationDto {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    online: boolean;
    verified: boolean;
    isModerator: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string | null;
    unreadCount: number;
  };
}

export interface MessageDto {
  id: string;
  text: string;
  timestamp: string;
  sender: "me" | "them";
  senderId?: string;
  readAt?: string | null;
  encrypted?: boolean;
  iv?: string | null;
  viewOnce?: boolean;
  viewOnceViewedAt?: string | null;
}

export interface MessagesResponse {
  messages: MessageDto[];
  serverTime: string;
}

export interface PeerDto {
  id: string;
  name: string;
  avatar?: string | null;
  verified: boolean;
  isModerator: boolean;
  publicKey?: string | null;
}

export interface DeviceDto {
  deviceId: string;
  deviceName?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
}

export interface StatusDto {
  id: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface StatusGroupDto {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    verified?: boolean;
    isModerator?: boolean;
  };
  statuses: StatusDto[];
}

class ApiClient {
  private baseUrl: string;
  private token: string | null;
  private refreshToken: string | null;
  private refreshPromise: Promise<boolean> | null = null;
  private authErrorHandler: ((status: number) => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("authToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem("refreshToken", token);
    } else {
      localStorage.removeItem("refreshToken");
    }
  }

  setAuthErrorHandler(handler: ((status: number) => void) | null) {
    this.authErrorHandler = handler;
  }

  private async refreshAuth(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        const data = await response.json();
        if (!response.ok) {
          this.setToken(null);
          this.setRefreshToken(null);
          return false;
        }

        this.setToken(data.token);
        this.setRefreshToken(data.refreshToken);
        return true;
      } catch {
        this.setToken(null);
        this.setRefreshToken(null);
        return false;
      }
    })();

    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    allowRefresh: boolean = true
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if ((response.status === 401 || response.status === 403) && allowRefresh) {
        const refreshed = await this.refreshAuth();
        if (refreshed) {
          return this.request(endpoint, options, false);
        }
        this.authErrorHandler?.(response.status);
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || "Request failed",
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  private async requestForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const headers = new Headers();
      if (this.token) {
        headers.set("Authorization", `Bearer ${this.token}`);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        const refreshed = await this.refreshAuth();
        if (refreshed) {
          return this.requestForm(endpoint, formData);
        }
        this.authErrorHandler?.(response.status);
      }

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || data.error || "Request failed" };
      }
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(
    email: string,
    password: string,
    name: string,
    phone: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, phone }),
    });
  }

  async verifyOTP(email: string, otp: string): Promise<ApiResponse<AuthResponse>> {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }

  async resendOTP(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(refreshToken: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  logoutOnExit(refreshToken: string) {
    const url = `${this.baseUrl}/auth/logout`;
    const payload = JSON.stringify({ refreshToken });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  }

  // User endpoints
  async getProfile(): Promise<ApiResponse<ApiUser>> {
    return this.request("/users/profile");
  }

  async updateProfile(data: any): Promise<ApiResponse<{ message: string }>> {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ message: string; avatar: string }>> {
    const form = new FormData();
    form.append("avatar", file);
    return this.requestForm("/users/avatar", form);
  }

  // Messages endpoints
  async getConversations(): Promise<ApiResponse<ConversationDto[]>> {
    return this.request("/messages/conversations");
  }

  async getMessages(
    conversationId: string,
    options?: { since?: string; markRead?: boolean }
  ): Promise<ApiResponse<MessagesResponse>> {
    const params = new URLSearchParams();
    if (options?.since) params.set("since", options.since);
    if (options?.markRead === false) params.set("markRead", "false");
    const query = params.toString();
    const suffix = query ? `?${query}` : "";
    return this.request(`/messages/conversations/${conversationId}${suffix}`);
  }

  async sendMessage(
    conversationId: string,
    message: string,
    viewOnce: boolean = false
  ): Promise<ApiResponse<MessageDto>> {
    return this.request(`/messages/conversations/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ message, viewOnce }),
    });
  }

  async sendEncryptedMessage(
    conversationId: string,
    payload: { ciphertext: string; iv: string; viewOnce?: boolean }
  ): Promise<ApiResponse<MessageDto>> {
    return this.request(`/messages/conversations/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        encrypted: true,
        viewOnce: Boolean(payload.viewOnce),
      }),
    });
  }

  async markConversationRead(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/messages/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }

  async viewOnceMessage(
    conversationId: string,
    messageId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/messages/conversations/${conversationId}/view-once/${messageId}`, {
      method: "POST",
    });
  }

  async getConversationPeer(conversationId: string): Promise<ApiResponse<PeerDto>> {
    return this.request(`/messages/conversations/${conversationId}/peer`);
  }

  // Calls endpoints
  async getCallHistory(): Promise<ApiResponse<any[]>> {
    return this.request("/calls/history");
  }

  async initiateCall(userId: string, type: "audio" | "video"): Promise<ApiResponse<any>> {
    return this.request("/calls/initiate", {
      method: "POST",
      body: JSON.stringify({ userId, type }),
    });
  }

  async endCall(callId: string) {
    return this.request(`/calls/${callId}/end`, {
      method: "POST",
    });
  }

  // Contacts endpoints
  async getContacts(): Promise<ApiResponse<any[]>> {
    return this.request("/contacts");
  }

  async addContact(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/contacts", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async searchUsers(query: string): Promise<ApiResponse<ApiUser[]>> {
    const q = encodeURIComponent(query);
    return this.request(`/users/search?q=${q}`);
  }

  // Admin endpoints
  async getUsers(page: number = 1, limit: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/admin/users?page=${page}&limit=${limit}`);
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  async getReports(): Promise<ApiResponse<any[]>> {
    return this.request("/admin/reports");
  }

  async resolveReport(reportId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/admin/reports/${reportId}/resolve`, {
      method: "POST",
    });
  }

  async getAnalytics(): Promise<ApiResponse<any>> {
    return this.request("/admin/analytics");
  }

  async getModerators(): Promise<ApiResponse<any[]>> {
    return this.request("/admin/moderators");
  }

  async createModerator(
    data: { email: string; password: string; name: string }
  ): Promise<ApiResponse<any>> {
    return this.request("/admin/moderators", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVerification(userId: string, verified: boolean): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/admin/users/${userId}/verification`, {
      method: "PUT",
      body: JSON.stringify({ verified }),
    });
  }

  async setPublicKey(publicKey: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/users/keys", {
      method: "PUT",
      body: JSON.stringify({ publicKey }),
    });
  }

  async registerDeviceKey(
    payload: { deviceId: string; publicKey: string; deviceName?: string }
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request("/users/devices/register", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async listDevices(): Promise<ApiResponse<DeviceDto[]>> {
    return this.request("/users/devices");
  }

  async verifyDevice(deviceId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/devices/${deviceId}/verify`, { method: "POST" });
  }

  async createStatus(payload: { text?: string; media?: File }): Promise<ApiResponse<StatusDto>> {
    const form = new FormData();
    if (payload.text) form.append("text", payload.text);
    if (payload.media) form.append("media", payload.media);
    return this.requestForm("/status", form);
  }

  async getStatuses(): Promise<ApiResponse<StatusGroupDto[]>> {
    return this.request("/status");
  }
}

export const api = new ApiClient(API_BASE_URL);
