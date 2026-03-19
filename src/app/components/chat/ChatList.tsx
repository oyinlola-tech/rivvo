import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, MoreVertical, Pin } from 'lucide-react';
import { VerificationBadge } from '../VerificationBadge';
import { ChatStreak } from '../ChatStreak';
import { formatDistanceToNow } from 'date-fns';

export function ChatList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuChat, setMenuChat] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { chats, searchChats, pinChat, muteChat, markAsRead } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredChats = searchQuery ? searchChats(searchQuery) : chats;
  const pinnedChats = filteredChats.filter(chat => chat.isPinned);
  const regularChats = filteredChats.filter(chat => !chat.isPinned);

  const ChatItem = ({ chat }: { chat: any }) => {
    const isGroup = chat.type === 'group';
    const otherParticipant = isGroup ? null : chat.participants.find((p: string) => p !== user?.id);

    const openMenu = () => {
      setMenuChat(chat);
      setMenuOpen(true);
    };

    const startLongPress = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') return;
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
      }
      longPressRef.current = setTimeout(() => {
        openMenu();
      }, 500);
    };

    const cancelLongPress = () => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    };

    return (
      <div
        onClick={() => navigate(`/chats/${chat.id}`)}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu();
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors border-b border-border"
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {chat.avatar ? (
              <img src={chat.avatar} alt={chat.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-primary text-lg">{chat.name?.charAt(0).toUpperCase() || 'C'}</span>
            )}
          </div>
          {!isGroup && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--online-indicator)] border-2 border-card rounded-full"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-foreground">{chat.name || 'Unknown'}</h3>
              {!isGroup && otherParticipant && <VerificationBadge role={otherParticipant.role || 'user'} size="sm" />}
              {chat.streak && <ChatStreak count={chat.streak} size="sm" />}
            </div>
            <div className="flex items-center gap-1">
              {chat.isPinned && <Pin className="w-3.5 h-3.5 text-muted-foreground fill-current" />}
              <span className="text-xs text-muted-foreground">
                {chat.lastMessage && formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: false })}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate flex-1">
              {chat.lastMessage?.content || 'No messages yet'}
            </p>
            {chat.unreadCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
            {chat.isMuted && (
              <svg className="w-4 h-4 text-muted-foreground ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-foreground">Chats</h2>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Plus className="w-5 h-5 text-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pinnedChats.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pinned</p>
            </div>
            {pinnedChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
          </div>
        )}
        {regularChats.length > 0 ? (
          regularChats.map(chat => <ChatItem key={chat.id} chat={chat} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
            <p>No chats found</p>
          </div>
        )}
      </div>

      {menuOpen && menuChat && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="w-full md:max-w-sm bg-card border border-border rounded-t-xl md:rounded-xl p-4">
            <div className="mb-3">
              <p className="text-foreground font-medium">{menuChat.name || 'Conversation'}</p>
              <p className="text-xs text-muted-foreground">Conversation actions</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  navigate(`/chats/${menuChat.id}`);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
              >
                Open
              </button>
              <button
                onClick={async () => {
                  await pinChat(menuChat.id, !menuChat.isPinned);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
              >
                {menuChat.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={async () => {
                  await muteChat(menuChat.id, !menuChat.isMuted);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
              >
                {menuChat.isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={async () => {
                  await markAsRead(menuChat.id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
              >
                Mark as read
              </button>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="mt-4 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const MessageCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
