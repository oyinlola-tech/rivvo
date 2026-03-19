import { apiRequest } from './config';
import type { User } from '../contexts/AuthContext';

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterResponse {
  message: string;
  email: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string, name: string): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async verifyOTP(email: string, otp: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  async resendOTP(email: string): Promise<{ message: string }> {
    return apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/auth/me');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiRequest<User>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<void> {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
