import { apiRequest, resolveAssetUrl } from './config';
import type { Chat, Message } from '../contexts/ChatContext';

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

const parseAttachmentPayload = (rawText: string | null) => {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed?.type !== 'attachment') return null;
    const kind = parsed.kind || '';
    const fileType = parsed.fileType || parsed.mime || '';
    const url = parsed.url || parsed.mediaUrl || parsed.path || null;
    const fileName = parsed.fileName || parsed.name || 'Attachment';
    let type: Message['type'] = 'file';
    if (kind === 'voice' || kind === 'audio' || fileType.startsWith('audio/')) {
      type = 'audio';
    } else if (fileType.startsWith('image/')) {
      type = 'image';
    } else if (fileType.startsWith('video/')) {
      type = 'video';
    }
    return {
      type,
      url: resolveAssetUrl(url),
      fileType,
      fileName
    };
  } catch {
    return null;
  }
};

const toMessage = (chatId: string, item: any): Message => {
  const rawText = typeof item?.text === 'string' ? item.text : '';
  const attachment = parseAttachmentPayload(rawText);
  const status = item?.readAt
    ? 'read'
    : item?.deliveredAt
      ? 'delivered'
      : 'sent';

  let content = rawText;
  let type: Message['type'] = 'text';
  let mediaUrl: string | undefined;
  let fileName: string | undefined;
  let fileType: string | undefined;

  if (item?.deletedForAllAt) {
    content = 'Message deleted';
  } else if (item?.encrypted) {
    content = 'Encrypted message';
  } else if (attachment) {
    type = attachment.type;
    mediaUrl = attachment.url || undefined;
    fileName = attachment.fileName || undefined;
    fileType = attachment.fileType || undefined;
    if (type === 'audio') {
      content = 'Voice note';
    } else if (type === 'image') {
      content = fileName || 'Photo';
    } else if (type === 'video') {
      content = fileName || 'Video';
    } else {
      content = fileName || 'Attachment';
    }
  }

  return {
    id: item?.id,
    chatId,
    senderId: item?.senderId,
    content,
    type,
    timestamp: item?.timestamp,
    status,
    replyTo: undefined,
    isDeleted: Boolean(item?.deletedForAllAt),
    mediaUrl,
    fileName,
    fileType,
  };
};

const toChat = (item: any): Chat => {
  const currentUserId = getCurrentUserId();
  const isGroup = Boolean(item?.user?.isGroup);
  const memberCount = Number(item?.user?.memberCount || 0);
  const participants = isGroup
    ? Array.from({ length: memberCount }).map(() => '')
    : [currentUserId, item?.user?.id].filter(Boolean) as string[];

  let lastMessage: Chat['lastMessage'] | undefined;
  if (item?.lastMessage) {
    const attachment = parseAttachmentPayload(item.lastMessage.text || '');
    const type = attachment?.type || 'text';
    let content = item.lastMessage.text || '';
    if (attachment) {
      if (type === 'audio') content = 'Voice note';
      else if (type === 'image') content = attachment.fileName || 'Photo';
      else if (type === 'video') content = attachment.fileName || 'Video';
      else content = attachment.fileName || 'Attachment';
    }
    lastMessage = {
      id: `${item.id}-last`,
      chatId: item.id,
      senderId: item?.user?.id,
      content,
      type,
      timestamp: item.lastMessage.timestamp || new Date().toISOString(),
      status: 'sent',
      mediaUrl: attachment?.url || undefined,
      fileName: attachment?.fileName || undefined,
      fileType: attachment?.fileType || undefined,
    };
  }

  return {
    id: item?.id,
    type: isGroup ? 'group' : 'private',
    name: item?.user?.name || 'Unknown',
    avatar: resolveAssetUrl(item?.user?.avatar) || undefined,
    participants,
    lastMessage,
    unreadCount: Number(item?.lastMessage?.unreadCount || 0),
    isPinned: false,
    isMuted: false,
    createdAt: item?.lastMessage?.timestamp || new Date().toISOString(),
    updatedAt: item?.lastMessage?.timestamp || new Date().toISOString(),
    streak: Number(item?.streakCount || 0),
    groupAdmin: [],
    groupId: isGroup ? item?.user?.id : undefined,
  };
};

export const chatApi = {
  async getChats(): Promise<Chat[]> {
    const data = await apiRequest<any[]>('/messages/conversations');
    return data.map(toChat);
  },

  async getChat(chatId: string): Promise<Chat> {
    const peer = await apiRequest<any>(`/messages/conversations/${chatId}/peer`);
    return toChat({
      id: chatId,
      user: peer?.isGroup
        ? {
            id: peer.id,
            name: peer.name,
            avatar: peer.avatar,
            isGroup: true,
            memberCount: peer.memberCount || 0,
          }
        : {
            id: peer.id,
            name: peer.name,
            avatar: peer.avatar,
          },
      lastMessage: null,
      streakCount: peer?.streakCount || 0,
    });
  },

  async getMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await apiRequest<{ messages: any[] }>(
      `/messages/conversations/${chatId}?limit=${limit}`
    );
    const messages = response?.messages || [];
    return messages.map((item) => toMessage(chatId, item));
  },

  async sendMessage(chatId: string, content: string, type: Message['type'] = 'text'): Promise<Message> {
    const response = await apiRequest<any>(`/messages/conversations/${chatId}`, {
      method: 'POST',
      body: JSON.stringify({ message: content, type }),
    });
    return toMessage(chatId, response);
  },

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    return apiRequest(`/messages/conversations/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  async markAsRead(chatId: string): Promise<void> {
    return apiRequest(`/messages/conversations/${chatId}/read`, {
      method: 'POST',
    });
  },

  async createPrivateChat(userId: string): Promise<Chat> {
    const response = await apiRequest<{ id: string }>(`/messages/conversations/with/${userId}`, {
      method: 'POST',
    });
    return chatApi.getChat(response.id);
  },

  async createGroup(name: string, participants: string[]): Promise<Chat> {
    const created = await apiRequest<{ id: string; conversationId: string }>(`/groups`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    const groupId = created.id;
    await Promise.all(
      participants.map((memberId) =>
        apiRequest(`/groups/${groupId}/members`, {
          method: 'POST',
          body: JSON.stringify({ memberId }),
        })
      )
    );
    return chatApi.getChat(created.conversationId);
  },

  async updateGroup(chatId: string, data: Partial<Chat>): Promise<Chat> {
    const groupId = data.groupId || null;
    if (!groupId) {
      return chatApi.getChat(chatId);
    }
    await apiRequest(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.name }),
    });
    return chatApi.getChat(chatId);
  },

  async addGroupMembers(chatId: string, userIds: string[]): Promise<void> {
    const chat = await chatApi.getChat(chatId);
    const groupId = (chat as any).groupId;
    if (!groupId) return;
    await Promise.all(
      userIds.map((memberId) =>
        apiRequest(`/groups/${groupId}/members`, {
          method: 'POST',
          body: JSON.stringify({ memberId }),
        })
      )
    );
  },

  async removeGroupMember(chatId: string, userId: string): Promise<void> {
    const chat = await chatApi.getChat(chatId);
    const groupId = (chat as any).groupId;
    if (!groupId) return;
    return apiRequest(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  async leaveGroup(chatId: string): Promise<void> {
    const chat = await chatApi.getChat(chatId);
    const groupId = (chat as any).groupId;
    if (!groupId) return;
    return apiRequest(`/groups/${groupId}/leave`, { method: 'POST' });
  },

  async pinChat(chatId: string, isPinned: boolean): Promise<void> {
    await apiRequest(`/messages/conversations/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ isPinned }),
    }).catch(() => {});
  },

  async muteChat(chatId: string, isMuted: boolean): Promise<void> {
    await apiRequest(`/messages/conversations/${chatId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ isMuted }),
    }).catch(() => {});
  },

  async searchMessages(chatId: string, query: string): Promise<Message[]> {
    const response = await apiRequest<{ messages: any[] }>(
      `/messages/conversations/${chatId}?q=${encodeURIComponent(query)}`
    );
    const messages = response?.messages || [];
    return messages.map((item) => toMessage(chatId, item));
  },
};
