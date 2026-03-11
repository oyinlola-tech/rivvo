// API configuration and utilities
// Replace with your actual backend API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
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

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string) {
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  async verifyOTP(email: string, otp: string) {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }

  async resendOTP(email: string) {
    return this.request("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(refreshToken: string) {
    return this.request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  // User endpoints
  async getProfile() {
    return this.request("/users/profile");
  }

  async updateProfile(data: any) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Messages endpoints
  async getConversations() {
    return this.request("/messages/conversations");
  }

  async getMessages(
    conversationId: string,
    options?: { since?: string; markRead?: boolean }
  ) {
    const params = new URLSearchParams();
    if (options?.since) params.set("since", options.since);
    if (options?.markRead === false) params.set("markRead", "false");
    const query = params.toString();
    const suffix = query ? `?${query}` : "";
    return this.request(`/messages/conversations/${conversationId}${suffix}`);
  }

  async sendMessage(conversationId: string, message: string) {
    return this.request(`/messages/conversations/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async sendEncryptedMessage(
    conversationId: string,
    payload: { ciphertext: string; iv: string }
  ) {
    return this.request(`/messages/conversations/${conversationId}`, {
      method: "POST",
      body: JSON.stringify({ ciphertext: payload.ciphertext, iv: payload.iv, encrypted: true }),
    });
  }

  async markConversationRead(conversationId: string) {
    return this.request(`/messages/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }

  async getConversationPeer(conversationId: string) {
    return this.request(`/messages/conversations/${conversationId}/peer`);
  }

  // Calls endpoints
  async getCallHistory() {
    return this.request("/calls/history");
  }

  async initiateCall(userId: string, type: "audio" | "video") {
    return this.request("/calls/initiate", {
      method: "POST",
      body: JSON.stringify({ userId, type }),
    });
  }

  // Contacts endpoints
  async getContacts() {
    return this.request("/contacts");
  }

  async addContact(userId: string) {
    return this.request("/contacts", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  // Admin endpoints
  async getUsers(page: number = 1, limit: number = 20) {
    return this.request(`/admin/users?page=${page}&limit=${limit}`);
  }

  async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  async getReports() {
    return this.request("/admin/reports");
  }

  async resolveReport(reportId: string) {
    return this.request(`/admin/reports/${reportId}/resolve`, {
      method: "POST",
    });
  }

  async getAnalytics() {
    return this.request("/admin/analytics");
  }

  async getModerators() {
    return this.request("/admin/moderators");
  }

  async createModerator(data: { email: string; password: string; name: string }) {
    return this.request("/admin/moderators", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVerification(userId: string, verified: boolean) {
    return this.request(`/admin/users/${userId}/verification`, {
      method: "PUT",
      body: JSON.stringify({ verified }),
    });
  }

  async setPublicKey(publicKey: string) {
    return this.request("/users/keys", {
      method: "PUT",
      body: JSON.stringify({ publicKey }),
    });
  }

  async registerDeviceKey(payload: { deviceId: string; publicKey: string; deviceName?: string }) {
    return this.request("/users/devices/register", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async listDevices() {
    return this.request("/users/devices");
  }

  async verifyDevice(deviceId: string) {
    return this.request(`/users/devices/${deviceId}/verify`, { method: "POST" });
  }
}

export const api = new ApiClient(API_BASE_URL);
