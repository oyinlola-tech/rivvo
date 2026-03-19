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

const getCurrentUserId = () => {
  const storedId = localStorage.getItem('rivvo_user_id');
  if (storedId) return storedId;
  try {
    const user = JSON.parse(localStorage.getItem('rivvo_user') || 'null');
    return user?.id || null;
  } catch {
    return null;
  }
};

const toCall = (item: any): Call => {
  const currentUserId = getCurrentUserId();
  const otherUser = item?.user || {};
  const isIncoming = item?.direction === 'incoming';
  const isMissed = item?.direction === 'missed';
  const status: Call['status'] = isMissed ? 'missed' : item?.duration ? 'ended' : 'ongoing';
  const type: Call['type'] = item?.type === 'video' ? 'video' : 'voice';

  return {
    id: item?.id,
    type,
    callerId: isIncoming ? otherUser.id : currentUserId || 'me',
    callerName: isIncoming ? otherUser.name : 'You',
    callerAvatar: isIncoming ? otherUser.avatar : undefined,
    receiverId: isIncoming ? currentUserId || 'me' : otherUser.id,
    receiverName: isIncoming ? 'You' : otherUser.name,
    receiverAvatar: isIncoming ? undefined : otherUser.avatar,
    status,
    startedAt: item?.timestamp,
    endedAt: item?.duration ? item?.timestamp : undefined,
    duration: item?.duration ?? undefined,
    createdAt: item?.timestamp,
  };
};

export const callsApi = {
  async getCallHistory(limit = 50, offset = 0): Promise<CallHistory> {
    const history = await apiRequest<any[]>(`/calls/history?limit=${limit}&offset=${offset}`);
    const calls = history.map(toCall);
    return { calls, total: calls.length };
  },

  async initiateCall(userId: string, type: 'voice' | 'video'): Promise<Call> {
    const response = await apiRequest<any>('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ userId, type: type === 'voice' ? 'audio' : 'video' }),
    });
    return {
      id: response.callId,
      type,
      callerId: getCurrentUserId() || 'me',
      callerName: 'You',
      receiverId: userId,
      receiverName: 'Contact',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
    };
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
    const detail = await apiRequest<any>(`/calls/${callId}`);
    return {
      id: detail.callId || callId,
      type: detail.type === 'video' ? 'video' : 'voice',
      callerId: '',
      callerName: '',
      receiverId: '',
      receiverName: '',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
    };
  },
};
