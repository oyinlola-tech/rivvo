import { apiRequest } from './config';

export interface Call {
  id: string;
  type: 'voice' | 'video';
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface CallHistory {
  calls: Call[];
  total: number;
}

export const callsApi = {
  async getCallHistory(limit = 50, offset = 0): Promise<CallHistory> {
    return apiRequest<CallHistory>(`/calls?limit=${limit}&offset=${offset}`);
  },

  async initiateCall(userId: string, type: 'voice' | 'video'): Promise<Call> {
    return apiRequest<Call>('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    });
  },

  async answerCall(callId: string): Promise<void> {
    return apiRequest(`/calls/${callId}/answer`, {
      method: 'POST',
    });
  },

  async declineCall(callId: string): Promise<void> {
    return apiRequest(`/calls/${callId}/decline`, {
      method: 'POST',
    });
  },

  async endCall(callId: string): Promise<void> {
    return apiRequest(`/calls/${callId}/end`, {
      method: 'POST',
    });
  },

  async getCallDetails(callId: string): Promise<Call> {
    return apiRequest<Call>(`/calls/${callId}`);
  },
};
