import { apiRequest } from './config';
import type { Chat, Message } from '../contexts/ChatContext';

export const chatApi = {
  async getChats(): Promise<Chat[]> {
    return apiRequest<Chat[]>('/chats');
  },

  async getChat(chatId: string): Promise<Chat> {
    return apiRequest<Chat>(`/chats/${chatId}`);
  },

  async getMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    return apiRequest<Message[]>(`/chats/${chatId}/messages?limit=${limit}&offset=${offset}`);
  },

  async sendMessage(chatId: string, content: string, type: Message['type'] = 'text'): Promise<Message> {
    return apiRequest<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    return apiRequest(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  async markAsRead(chatId: string): Promise<void> {
    return apiRequest(`/chats/${chatId}/read`, {
      method: 'POST',
    });
  },

  async createPrivateChat(userId: string): Promise<Chat> {
    return apiRequest<Chat>('/chats/private', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async createGroup(name: string, participants: string[]): Promise<Chat> {
    return apiRequest<Chat>('/chats/group', {
      method: 'POST',
      body: JSON.stringify({ name, participants }),
    });
  },

  async updateGroup(chatId: string, data: Partial<Chat>): Promise<Chat> {
    return apiRequest<Chat>(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async addGroupMembers(chatId: string, userIds: string[]): Promise<void> {
    return apiRequest(`/chats/${chatId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  async removeGroupMember(chatId: string, userId: string): Promise<void> {
    return apiRequest(`/chats/${chatId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async leaveGroup(chatId: string): Promise<void> {
    return apiRequest(`/chats/${chatId}/leave`, {
      method: 'POST',
    });
  },

  async pinChat(chatId: string, isPinned: boolean): Promise<void> {
    return apiRequest(`/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ isPinned }),
    });
  },

  async muteChat(chatId: string, isMuted: boolean): Promise<void> {
    return apiRequest(`/chats/${chatId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ isMuted }),
    });
  },

  async searchMessages(chatId: string, query: string): Promise<Message[]> {
    return apiRequest<Message[]>(`/chats/${chatId}/search?q=${encodeURIComponent(query)}`);
  },
};
