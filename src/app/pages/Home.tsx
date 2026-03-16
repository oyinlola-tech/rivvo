import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Flame, Bell } from "lucide-react";
import { api, ConversationDto } from "../lib/api";
import { getSocket } from "../lib/socket";
import { VerificationBadge } from "../components/VerificationBadge";
import { useAuth } from "../contexts/AuthContext";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";
import { readCache, writeCache } from "../lib/cache";
import { preloadImages } from "../lib/imageCache";

export default function Home() {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewMessages, setPreviewMessages] = useState<
    { id: string; text: string; timestamp: string | null; sender: "me" | "them" }[]
  >([]);
  const [previewContact, setPreviewContact] = useState<ConversationDto["user"] | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const hoverTimerRef = useRef<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  


  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    const cacheKey = user?.id ? `conversations:${user.id}` : "conversations:guest";

    const handleIncoming = (payload: {
      conversationId: string;
      message: { text: string; timestamp: string; senderId?: string; encrypted?: boolean; viewOnce?: boolean };
    }) => {
      if (payload.message.senderId && payload.message.senderId === user?.id) {
        return;
      }
      setConversations((prev) => {
        const next = prev.map((conv) => {
          if (conv.id !== payload.conversationId) return conv;
          return {
            ...conv,
            lastMessage: {
              text: payload.message.viewOnce
                ? "View once message"
                : payload.message.encrypted
                  ? "Message"
                  : payload.message.text,
              timestamp: payload.message.timestamp,
              unreadCount: conv.lastMessage.unreadCount + 1,
            },
          };
        });
        writeCache(cacheKey, next);
        return next;
      });
    };

    socket.on("new_message", handleIncoming);
    return () => {
      socket.off("new_message", handleIncoming);
    };
  }, [user?.id]);

  const loadConversations = async () => {
    setError("");
    const cacheKey = user?.id ? `conversations:${user.id}` : "conversations:guest";
    const cached = readCache<ConversationDto[]>(cacheKey, 60_000);
    if (cached && cached.length) {
      setConversations(cached);
      setLoading(false);
      preloadImages(cached.map((conv) => conv.user.avatar));
      return;
    }

    const response = await api.getConversations();
    if (response.success && response.data) {
      setConversations(response.data);
      writeCache(cacheKey, response.data);
      preloadImages(response.data.map((conv) => conv.user.avatar));
    } else if (!response.success) {
      setError(response.error || "Failed to load conversations");
    }
    setLoading(false);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp?: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString();
  };

  const openPreview = async (conversation: ConversationDto) => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewContact(conversation.user);
    setPreviewMessages([]);
    setPreviewOpen(true);
    const response = await api.getConversationPreview(conversation.id, 5);
    if (response.success && response.data) {
      setPreviewMessages(response.data);
    } else {
      setPreviewError(response.error || "Unable to load preview");
    }
    setPreviewLoading(false);
  };

  const handleLongPressStart = (conversation: ConversationDto) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openPreview(conversation);
    }, 450);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  };

  const handleHoverStart = (conversation: ConversationDto) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      openPreview(conversation);
    }, 350);
  };

  const handleHoverEnd = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    setPreviewOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      {/* Header */}
      <div className="bg-[#111b21] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Messages</h1>
            </div>
            <button
              className="relative w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
              onClick={openNotificationsSheet}
              aria-label="Notifications"
            >
              <Bell className="text-white" size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F04A4C] text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-160px)] pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/messages/${conversation.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                onTouchStart={() => handleLongPressStart(conversation)}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
                onMouseEnter={() => handleHoverStart(conversation)}
                onMouseLeave={handleHoverEnd}
                onClick={(event) => {
                  if (longPressTriggeredRef.current) {
                    event.preventDefault();
                    longPressTriggeredRef.current = false;
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigate(`/users/${conversation.user.id}`);
                      }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white text-xl font-bold overflow-hidden"
                      aria-label={`View ${conversation.user.name} profile`}
                    >
                      {conversation.user.avatar ? (
                        <img
                          src={conversation.user.avatar}
                          alt={conversation.user.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        conversation.user.name[0].toUpperCase()
                      )}
                    </button>
                    {conversation.user.online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#0FE16D] rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#111b21] truncate">
                          {conversation.user.name}
                        </h3>
                        {(conversation.user.isVerifiedBadge ||
                          conversation.user.isModerator ||
                          conversation.user.isAdmin) && (
                          <VerificationBadge
                            type={conversation.user.isModerator || conversation.user.isAdmin ? "staff" : "user"}
                            size="sm"
                          />
                        )}
                      </div>
                      {conversation.lastMessage.timestamp && (
                        <span className="text-xs text-[#667781]">
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#667781] truncate">
                        {conversation.lastMessage.timestamp
                          ? conversation.lastMessage.text === "Encrypted message"
                            ? "Message"
                            : conversation.lastMessage.text
                          : "No messages yet"}
                      </p>
                      <div className="flex items-center gap-2">
                        {(conversation.streakCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-[#1a8c7a]">
                            <Flame size={12} />
                            {conversation.streakCount}
                          </div>
                        )}
                        {conversation.lastMessage.unreadCount > 0 && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F04A4C] flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {conversation.lastMessage.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 md:items-center md:justify-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#667781]">Preview</p>
                <p className="text-base font-semibold text-[#111b21]">
                  {previewContact?.name || "Conversation"}
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-sm text-[#667781]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {previewLoading ? (
                <div className="py-6 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a8c7a]"></div>
                </div>
              ) : previewError ? (
                <p className="text-sm text-red-600">{previewError}</p>
              ) : previewMessages.length === 0 ? (
                <p className="text-sm text-[#667781]">No messages yet.</p>
              ) : (
                previewMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.sender === "me"
                        ? "bg-[#1a8c7a] text-white ml-8"
                        : "bg-[#f0f2f5] text-[#111b21] mr-8"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




