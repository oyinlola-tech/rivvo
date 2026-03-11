import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, Plus } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { VerificationBadge } from "../components/VerificationBadge";
import { useAuth } from "../contexts/AuthContext";

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
    verified: boolean;
    isModerator: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    unreadCount: number;
  };
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);

    const handleIncoming = (payload: {
      conversationId: string;
      message: { text: string; timestamp: string; senderId?: string };
    }) => {
      if (payload.message.senderId && payload.message.senderId === user?.id) {
        return;
      }
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== payload.conversationId) return conv;
          return {
            ...conv,
            lastMessage: {
              text: payload.message.text,
              timestamp: payload.message.timestamp,
              unreadCount: conv.lastMessage.unreadCount + 1,
            },
          };
        })
      );
    };

    socket.on("new_message", handleIncoming);
    return () => {
      socket.off("new_message", handleIncoming);
    };
  }, [user?.id]);

  const loadConversations = async () => {
    const response = await api.getConversations();
    if (response.success && response.data) {
      setConversations(response.data);
    }
    setLoading(false);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
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

  return (
    <div className="min-h-screen bg-[#000e08] md:ml-64">
      {/* Header */}
      <div className="bg-[#000e08] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <button className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              <Plus className="text-white" size={24} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#20A090]"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-160px)] pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20A090]"></div>
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
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-xl font-bold">
                      {conversation.user.avatar ? (
                        <img
                          src={conversation.user.avatar}
                          alt={conversation.user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        conversation.user.name[0].toUpperCase()
                      )}
                    </div>
                    {conversation.user.online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#0FE16D] rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#000e08] truncate">
                          {conversation.user.name}
                        </h3>
                        {conversation.user.verified && (
                          <VerificationBadge type={conversation.user.isModerator ? "mod" : "user"} size="sm" />
                        )}
                      </div>
                      <span className="text-xs text-[#797c7b]">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#797c7b] truncate">
                        {conversation.lastMessage.text}
                      </p>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
