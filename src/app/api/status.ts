import { apiRequest } from './config';

export interface Status {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'image' | 'video' | 'text';
  content: string;
  backgroundColor?: string;
  caption?: string;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  viewed?: boolean;
}

export interface StatusView {
  id: string;
  statusId: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  viewedAt: string;
}

export const statusApi = {
  async getStatuses(): Promise<Status[]> {
    return apiRequest<Status[]>('/status');
  },

  async getMyStatuses(): Promise<Status[]> {
    return apiRequest<Status[]>('/status/me');
  },

  async createStatus(type: Status['type'], content: string, caption?: string, backgroundColor?: string): Promise<Status> {
    return apiRequest<Status>('/status', {
      method: 'POST',
      body: JSON.stringify({ type, content, caption, backgroundColor }),
    });
  },

  async deleteStatus(statusId: string): Promise<void> {
    return apiRequest(`/status/${statusId}`, {
      method: 'DELETE',
    });
  },

  async viewStatus(statusId: string): Promise<void> {
    return apiRequest(`/status/${statusId}/view`, {
      method: 'POST',
    });
  },

  async getStatusViews(statusId: string): Promise<StatusView[]> {
    return apiRequest<StatusView[]>(`/status/${statusId}/views`);
  },
};
