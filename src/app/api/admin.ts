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
    return apiRequest<AdminStats>('/admin/stats');
  },

  async getAllUsers(limit = 50, offset = 0, search?: string): Promise<{ users: User[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.append('search', search);
    return apiRequest<{ users: User[]; total: number }>(`/admin/users?${params}`);
  },

  async getUserDetails(userId: string): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}`);
  },

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(userId: string): Promise<void> {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async verifyUser(userId: string): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}/verify`, {
      method: 'POST',
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

  async promoteToModerator(userId: string): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}/promote`, {
      method: 'POST',
    });
  },

  async demoteFromModerator(userId: string): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}/demote`, {
      method: 'POST',
    });
  },

  async banUser(userId: string, reason?: string): Promise<void> {
    return apiRequest(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async unbanUser(userId: string): Promise<void> {
    return apiRequest(`/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  },
};
