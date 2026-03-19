import { apiRequest } from './config';
import type { User } from '../contexts/AuthContext';

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface RegisterResponse {
  message: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: email, password }),
    });
  },

  async register(email: string, password: string, name: string): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>('/auth/signup', {
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
    return apiRequest<User>('/users/profile');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiRequest<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async logout(refreshToken: string): Promise<void> {
    return apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
};
