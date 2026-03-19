import React, { createContext, useContext, useState, useEffect } from 'react';
import { chatApi } from '../api/chat';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
  isDeleted?: boolean;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
  streak?: number;
  groupAdmin?: string[];
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  loading: boolean;
  setActiveChat: (chatId: string | null) => void;
  sendMessage: (chatId: string, content: string, type?: Message['type']) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  createGroup: (name: string, participants: string[]) => Promise<Chat>;
  updateGroup: (chatId: string, data: Partial<Chat>) => Promise<void>;
  leaveGroup: (chatId: string) => Promise<void>;
  pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  muteChat: (chatId: string, isMuted: boolean) => Promise<void>;
  searchChats: (query: string) => Chat[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChatState] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
    }
  }, [isAuthenticated]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const chatsData = await chatApi.getChats();
      setChats(chatsData);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveChat = async (chatId: string | null) => {
    if (!chatId) {
      setActiveChatState(null);
      setMessages([]);
      return;
    }

    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChatState(chat);
      const messagesData = await chatApi.getMessages(chatId);
      setMessages(messagesData);
      await markAsRead(chatId);
    }
  };

  const sendMessage = async (chatId: string, content: string, type: Message['type'] = 'text') => {
    const message = await chatApi.sendMessage(chatId, content, type);
    setMessages(prev => [...prev, message]);
    await loadChats();
  };

  const deleteMessage = async (messageId: string) => {
    await chatApi.deleteMessage(messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const markAsRead = async (chatId: string) => {
    await chatApi.markAsRead(chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  };

  const createGroup = async (name: string, participants: string[]) => {
    const group = await chatApi.createGroup(name, participants);
    await loadChats();
    return group;
  };

  const updateGroup = async (chatId: string, data: Partial<Chat>) => {
    await chatApi.updateGroup(chatId, data);
    await loadChats();
  };

  const leaveGroup = async (chatId: string) => {
    await chatApi.leaveGroup(chatId);
    await loadChats();
  };

  const pinChat = async (chatId: string, isPinned: boolean) => {
    await chatApi.pinChat(chatId, isPinned);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned } : c));
  };

  const muteChat = async (chatId: string, isMuted: boolean) => {
    await chatApi.muteChat(chatId, isMuted);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isMuted } : c));
  };

  const searchChats = (query: string) => {
    return chats.filter(chat =>
      chat.name?.toLowerCase().includes(query.toLowerCase())
    );
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        loading,
        setActiveChat,
        sendMessage,
        deleteMessage,
        markAsRead,
        createGroup,
        updateGroup,
        leaveGroup,
        pinChat,
        muteChat,
        searchChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
