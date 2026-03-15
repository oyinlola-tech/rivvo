// API configuration and utilities
// Replace with your actual backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const withMediaBase = (url?: string | null) => {
  if (!url) return null;
  let normalized = url.trim();
  if (normalized.startsWith("http//")) {
    normalized = `http://${normalized.slice(6)}`;
  }
  if (normalized.startsWith("https//")) {
    normalized = `https://${normalized.slice(7)}`;
  }
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const httpIndex = normalized.indexOf("http://");
  const httpsIndex = normalized.indexOf("https://");
  const embeddedIndex =
    httpIndex >= 0 && httpsIndex >= 0 ? Math.min(httpIndex, httpsIndex) : Math.max(httpIndex, httpsIndex);
  if (embeddedIndex >= 0) {
    return normalized.slice(embeddedIndex);
  }
  if (normalized.startsWith("/")) {
    return `${MEDIA_BASE_URL}${normalized}`;
  }
  return normalized;
};

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
    isVerifiedBadge: boolean;
    badgeStatus?: "none" | "active" | "expired";
    isModerator: boolean;
    isAdmin: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string | null;
    unreadCount: number;
  };
  streakCount?: number;
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
  isVerifiedBadge: boolean;
  badgeStatus?: "none" | "active" | "expired";
  isModerator: boolean;
  isAdmin: boolean;
  publicKey?: string | null;
  streakCount?: number;
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
  viewedAt?: string | null;
}

export interface StatusGroupDto {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    verified?: boolean;
    isVerifiedBadge?: boolean;
    badgeStatus?: "none" | "active" | "expired";
    isModerator?: boolean;
    isAdmin?: boolean;
  };
  statuses: StatusDto[];
}

export interface StatusResponseDto {
  unviewed: StatusGroupDto[];
  viewed: StatusGroupDto[];
  muted: { id: string; name: string; avatar?: string | null }[];
}

export interface VerificationPaymentDto {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    phone?: string | null;
    username?: string | null;
  };
  amount: number;
  currency: string;
  status: string;
  reviewStatus: string;
  rejectionReason?: string | null;
  txRef: string;
  flwStatus?: string | null;
  createdAt: string;
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
  async login(identifier: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  }

  async signup(
    email: string,
    password: string,
    name: string,
    phone?: string
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
    const response = await this.request<ApiUser>("/users/profile");
    if (response.success && response.data) {
      response.data.avatar = withMediaBase(response.data.avatar);
    }
    return response;
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
    const response = await this.requestForm<{ message: string; avatar: string }>("/users/avatar", form);
    if (response.success && response.data?.avatar) {
      response.data.avatar = withMediaBase(response.data.avatar) || response.data.avatar;
    }
    return response;
  }

  // Messages endpoints
  async getConversations(): Promise<ApiResponse<ConversationDto[]>> {
    const response = await this.request<ConversationDto[]>("/messages/conversations");
    if (response.success && response.data) {
      response.data = response.data.map((conv) => ({
        ...conv,
        user: {
          ...conv.user,
          avatar: withMediaBase(conv.user.avatar),
        },
      }));
    }
    return response;
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
    const response = await this.request<PeerDto>(`/messages/conversations/${conversationId}/peer`);
    if (response.success && response.data) {
      response.data.avatar = withMediaBase(response.data.avatar);
    }
    return response;
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
    const response = await this.request<any[]>("/contacts");
    if (response.success && response.data) {
      response.data = response.data.map((contact) => ({
        ...contact,
        avatar: withMediaBase(contact.avatar),
      }));
    }
    return response;
  }

  async getContactRequests(direction: "incoming" | "outgoing" = "incoming"): Promise<ApiResponse<any[]>> {
    const response = await this.request<any[]>(`/contacts/requests?direction=${direction}`);
    if (response.success && response.data) {
      response.data = response.data.map((request) => ({
        ...request,
        user: {
          ...request.user,
          avatar: withMediaBase(request.user.avatar),
        },
      }));
    }
    return response;
  }

  async acceptContactRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/contacts/requests/${requestId}/accept`, { method: "POST" });
  }

  async rejectContactRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/contacts/requests/${requestId}/reject`, { method: "POST" });
  }

  async addContact(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/contacts", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async searchUsers(query: string): Promise<ApiResponse<ApiUser[]>> {
    const q = encodeURIComponent(query);
    const response = await this.request<ApiUser[]>(`/users/search?q=${q}`);
    if (response.success && response.data) {
      response.data = response.data.map((user) => ({
        ...user,
        avatar: withMediaBase(user.avatar),
      }));
    }
    return response;
  }

  async getUserPublicProfile(userId: string): Promise<ApiResponse<any>> {
    const response = await this.request<any>(`/users/${userId}/public`);
    if (response.success && response.data) {
      response.data.avatar = withMediaBase(response.data.avatar);
    }
    return response;
  }

  async uploadAttachment(
    conversationId: string,
    formData: FormData
  ): Promise<ApiResponse<{ url: string; size: number; fileType: string; fileName: string; kind: string }>> {
    return this.requestForm(`/messages/conversations/${conversationId}/attachments`, formData);
  }

  async getOrCreateConversation(userId: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/messages/conversations/with/${userId}`, { method: "POST" });
  }

  // Invites
  async createUserInvite(): Promise<ApiResponse<{ token: string }>> {
    return this.request("/invites/users", { method: "POST" });
  }

  async resolveUserInvite(token: string): Promise<ApiResponse<ApiUser>> {
    return this.request(`/invites/users/${token}`);
  }

  async resolveGroupInvite(token: string): Promise<ApiResponse<any>> {
    return this.request(`/invites/groups/${token}`);
  }

  // Groups
  async createGroup(payload: {
    name: string;
    description?: string;
    isPrivate: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request("/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listGroups(): Promise<ApiResponse<any[]>> {
    return this.request("/groups");
  }

  async searchPublicGroups(query: string): Promise<ApiResponse<any[]>> {
    const q = encodeURIComponent(query);
    return this.request(`/groups/public?q=${q}`);
  }

  async getGroup(groupId: string): Promise<ApiResponse<any>> {
    return this.request(`/groups/${groupId}`);
  }

  async listGroupMembers(groupId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/groups/${groupId}/members`);
  }

  async createGroupInvite(groupId: string): Promise<ApiResponse<{ token: string; groupId: string }>> {
    return this.request(`/groups/${groupId}/invites`, { method: "POST" });
  }

  async joinGroupByInvite(token: string): Promise<ApiResponse<any>> {
    return this.request(`/groups/invites/${token}/join`, { method: "POST" });
  }

  async joinPublicGroup(groupId: string): Promise<ApiResponse<any>> {
    return this.request(`/groups/${groupId}/join`, { method: "POST" });
  }

  async listJoinRequests(groupId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/groups/${groupId}/requests`);
  }

  async approveJoin(groupId: string, requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/groups/${groupId}/requests/${requestId}/approve`, { method: "POST" });
  }

  async rejectJoin(groupId: string, requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/groups/${groupId}/requests/${requestId}/reject`, { method: "POST" });
  }

  async promoteGroupAdmin(groupId: string, memberId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/groups/${groupId}/admins`, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
  }

  async demoteGroupAdmin(groupId: string, memberId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/groups/${groupId}/admins/${memberId}`, { method: "DELETE" });
  }

  // Call links
  async createCallLink(payload: {
    type: "audio" | "video";
    scope: "direct" | "group";
    groupId?: string;
  }): Promise<ApiResponse<{ token: string; roomUrl: string; joinUrl: string; type: string; scope: string }>> {
    return this.request("/call-links", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async resolveCallLink(token: string): Promise<ApiResponse<any>> {
    return this.request(`/call-links/${token}`);
  }

  // Reports & Blocks
  async reportUser(payload: {
    reportedUserId: string;
    reason: string;
    description?: string;
    conversationId?: string;
    block?: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request("/reports/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async reportMessage(payload: {
    messageId: string;
    reason: string;
    description?: string;
    block?: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request("/reports/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getBlockedUsers(): Promise<ApiResponse<ApiUser[]>> {
    return this.request("/blocks");
  }

  async blockUser(blockedUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
    });
  }

  async unblockUser(blockedUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/blocks/${blockedUserId}`, { method: "DELETE" });
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

  async assignReport(reportId: string, moderatorId: string | null): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/admin/reports/${reportId}/assign`, {
      method: "POST",
      body: JSON.stringify({ moderatorId }),
    });
  }

  async getReportMessages(reportId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/admin/reports/${reportId}/messages`);
  }

  async updateUserStatus(userId: string, status: "active" | "suspended"): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // Moderation endpoints
  async getModerationReports(): Promise<ApiResponse<any[]>> {
    return this.request("/moderation/reports");
  }

  async getModerationUnassignedReports(): Promise<ApiResponse<any[]>> {
    return this.request("/moderation/reports/unassigned");
  }

  async getModerationReportMessages(reportId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/moderation/reports/${reportId}/messages`);
  }

  async resolveModerationReport(reportId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/moderation/reports/${reportId}/resolve`, { method: "POST" });
  }

  async assignModerationReport(reportId: string, moderatorId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/moderation/reports/${reportId}/assign`, {
      method: "POST",
      body: JSON.stringify({ moderatorId }),
    });
  }

  async getModeratorsList(): Promise<ApiResponse<any[]>> {
    return this.request("/moderation/moderators");
  }

  async updateModerationUserStatus(
    userId: string,
    status: "active" | "suspended"
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/moderation/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async getModerationAuditLogs(): Promise<ApiResponse<any[]>> {
    return this.request("/moderation/audit-logs");
  }

  async getModerationBlocks(): Promise<ApiResponse<any[]>> {
    return this.request("/moderation/blocks");
  }

  async searchModerationUsers(query: string): Promise<ApiResponse<any[]>> {
    const q = encodeURIComponent(query);
    return this.request(`/moderation/users/search?q=${q}`);
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

  async getVerificationPayments(
    page: number = 1,
    limit: number = 20,
    filters?: { status?: string; reviewStatus?: string }
  ): Promise<ApiResponse<{ payments: VerificationPaymentDto[]; total: number; page: number; limit: number }>> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (filters?.status) params.set("status", filters.status);
    if (filters?.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
    const query = params.toString();
    return this.request(`/admin/verification/payments?${query}`);
  }

  async reviewVerificationPayment(paymentId: string, action: "approve" | "reject", reason?: string) {
    return this.request(`/admin/verification/payments/${paymentId}/review`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
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
    const response = await this.requestForm<StatusDto>("/status", form);
    if (response.success && response.data) {
      response.data.mediaUrl = withMediaBase(response.data.mediaUrl);
    }
    return response;
  }

  async getStatuses(): Promise<ApiResponse<StatusResponseDto>> {
    const response = await this.request<StatusResponseDto>("/status");
    if (response.success && response.data) {
      response.data = {
        ...response.data,
        unviewed: response.data.unviewed.map((group) => ({
          ...group,
          user: {
            ...group.user,
            avatar: withMediaBase(group.user.avatar),
          },
          statuses: group.statuses.map((status) => ({
            ...status,
            mediaUrl: withMediaBase(status.mediaUrl),
          })),
        })),
        viewed: response.data.viewed.map((group) => ({
          ...group,
          user: {
            ...group.user,
            avatar: withMediaBase(group.user.avatar),
          },
          statuses: group.statuses.map((status) => ({
            ...status,
            mediaUrl: withMediaBase(status.mediaUrl),
          })),
        })),
        muted: response.data.muted.map((muted) => ({
          ...muted,
          avatar: withMediaBase(muted.avatar),
        })),
      };
    }
    return response;
  }

  async markStatusViewed(statusId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/status/${statusId}/view`, { method: "POST" });
  }

  async muteStatusUser(mutedUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request("/status/mute", {
      method: "POST",
      body: JSON.stringify({ mutedUserId }),
    });
  }

  async unmuteStatusUser(mutedUserId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/status/mute/${mutedUserId}`, { method: "DELETE" });
  }

  // Verification
  async getVerificationPricing(): Promise<ApiResponse<{ amount: number | null; currency: string | null; active: boolean }>> {
    return this.request("/verification/pricing");
  }

  async getVerificationEligibility(): Promise<ApiResponse<{ eligible: boolean; eligibleAt: string | null }>> {
    return this.request("/verification/eligibility");
  }

  async createVerificationCheckout(): Promise<ApiResponse<{ txRef: string; link: string; amount: number; currency: string }>> {
    return this.request("/verification/checkout", { method: "POST" });
  }

  async getVerificationStatus(): Promise<ApiResponse<{
    latestPending: { status: string; reviewStatus: string; rejectionReason: string | null; createdAt: string | null } | null;
    latestDecision: { status: string; reviewStatus: string; rejectionReason: string | null; createdAt: string | null } | null;
    currentStatus?: "pending" | "approved" | "rejected" | "none";
  }>> {
    return this.request("/verification/status");
  }
}

export const api = new ApiClient(API_BASE_URL);
