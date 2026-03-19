import { apiRequest } from './config';
import type { User } from '../contexts/AuthContext';

export interface Contact extends User {
  isFavorite?: boolean;
  isBlocked?: boolean;
  addedAt: string;
}

export const contactsApi = {
  async getContacts(): Promise<Contact[]> {
    return apiRequest<Contact[]>('/contacts');
  },

  async addContact(userId: string): Promise<Contact> {
    return apiRequest<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async removeContact(userId: string): Promise<void> {
    return apiRequest(`/contacts/${userId}`, {
      method: 'DELETE',
    });
  },

  async toggleFavorite(userId: string, isFavorite: boolean): Promise<void> {
    return apiRequest(`/contacts/${userId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ isFavorite }),
    });
  },

  async blockContact(userId: string): Promise<void> {
    return apiRequest(`/contacts/${userId}/block`, {
      method: 'POST',
    });
  },

  async unblockContact(userId: string): Promise<void> {
    return apiRequest(`/contacts/${userId}/unblock`, {
      method: 'POST',
    });
  },

  async searchUsers(query: string): Promise<User[]> {
    return apiRequest<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  },
};
