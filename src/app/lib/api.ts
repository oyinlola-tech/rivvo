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
  private authErrorHandler: ((status: number) => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("authToken");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }

  setAuthErrorHandler(handler: ((status: number) => void) | null) {
    this.authErrorHandler = handler;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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

      if (response.status === 401 || response.status === 403) {
        this.authErrorHandler?.(response.status);
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Request failed",
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

  async getMessages(conversationId: string) {
    return this.request(`/messages/conversations/${conversationId}`);
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
}

export const api = new ApiClient(API_BASE_URL);
