import { apiRequest } from './config';
import type { User } from '../contexts/AuthContext';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalGroups: number;
  totalCalls: number;
  newUsersToday: number;
  messagesPerDay: { date: string; count: number }[];
  usersPerDay: { date: string; count: number }[];
}

export interface ModeratorCreate {
  email: string;
  name: string;
  password: string;
}

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    return apiRequest<AdminStats>('/admin/analytics');
  },

  async getAllUsers(limit = 50, offset = 0, search?: string): Promise<{ users: User[]; total: number }> {
    const page = Math.floor(offset / limit) + 1;
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (search) params.append('search', search);
    return apiRequest<{ users: User[]; total: number }>(`/admin/users?${params}`);
  },

  async deleteUser(userId: string): Promise<void> {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async verifyUser(userId: string): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}/verification`, {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    });
  },

  async getModerators(): Promise<User[]> {
    return apiRequest<User[]>('/admin/moderators');
  },

  async createModerator(data: ModeratorCreate): Promise<User> {
    return apiRequest<User>('/admin/moderators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeModerator(userId: string): Promise<void> {
    return apiRequest(`/admin/moderators/${userId}`, {
      method: 'DELETE',
    });
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    return apiRequest(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async updateVerificationBadge(userId: string, active: boolean): Promise<void> {
    return apiRequest(`/admin/users/${userId}/verification-badge`, {
      method: 'PUT',
      body: JSON.stringify({ active }),
    });
  },
};
