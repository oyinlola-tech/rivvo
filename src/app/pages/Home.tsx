import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Plus, Flame } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { VerificationBadge } from "../components/VerificationBadge";
import { useAuth } from "../contexts/AuthContext";

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    online: boolean;
    verified: boolean;
    isVerifiedBadge: boolean;
    isModerator: boolean;
    isAdmin: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string | null;
    unreadCount: number;
  };
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);

    const handleIncoming = (payload: {
      conversationId: string;
      message: { text: string; timestamp: string; senderId?: string; encrypted?: boolean; viewOnce?: boolean };
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
              text: payload.message.viewOnce
                ? "View once message"
                : payload.message.encrypted
                  ? "Encrypted message"
                  : payload.message.text,
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
    setError("");
    const response = await api.getConversations();
    if (response.success && response.data) {
      setConversations(response.data);
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

  const handleUserSearch = async () => {
    const query = userQuery.trim();
    if (!query) {
      setUserResults([]);
      return;
    }
    setUserLoading(true);
    setUserError("");
    const response = await api.searchUsers(query);
    if (response.success && response.data) {
      setUserResults(response.data);
    } else if (!response.success) {
      setUserError(response.error || "Failed to search users");
    }
    setUserLoading(false);
  };

  const loadContacts = async () => {
    if (contactsLoading || contacts.length) return;
    setContactsLoading(true);
    const response = await api.getContacts();
    if (response.success && response.data) {
      setContacts(response.data);
    }
    setContactsLoading(false);
  };

  const handleStartChat = async (userId: string) => {
    setUserError("");
    const response = await api.getOrCreateConversation(userId);
    if (response.success && response.data?.id) {
      setShowNewChat(false);
      setUserQuery("");
      setUserResults([]);
      navigate(`/messages/${response.data.id}`);
    } else if (!response.success) {
      setUserError(response.error || "Failed to start chat");
    }
  };

  useEffect(() => {
    if (showNewChat) {
      loadContacts();
    }
  }, [showNewChat]);

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
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
              onClick={() => setShowNewChat(true)}
              aria-label="Start new chat"
            >
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
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-160px)] pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]"></div>
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
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-xl font-bold">
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
                          ? conversation.lastMessage.text
                          : "No messages yet"}
                      </p>
                      <div className="flex items-center gap-2">
                        {conversation.streakCount && conversation.streakCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-[#25D366]">
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

      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/40 md:ml-64">
          <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111b21]">New chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setUserQuery("");
                  setUserResults([]);
                  setUserError("");
                }}
                className="text-sm text-[#667781]"
              >
                Close
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                placeholder="Search by name, email, phone, or username"
                className="w-full pl-11 pr-4 py-3 bg-[#f0f2f5] rounded-full focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>
            {userError && <p className="text-sm text-red-600 mb-3">{userError}</p>}
            {!userQuery.trim() && (
              <>
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-[#667781] mb-2">
                    Recent
                  </div>
                  {conversations.length === 0 ? (
                    <p className="text-sm text-[#667781]">No recent chats yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {conversations.slice(0, 5).map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => navigate(`/messages/${conversation.id}`)}
                          className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-[#f7f9f9]"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold">
                            {conversation.user.avatar ? (
                              <img
                                src={conversation.user.avatar}
                                alt={conversation.user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              conversation.user.name?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#111b21]">
                              {conversation.user.name}
                            </p>
                            <p className="text-xs text-[#667781]">
                              {conversation.lastMessage.text || "No messages yet"}
                            </p>
                          </div>
                          <span className="text-xs text-[#25D366] font-medium">Open</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <div className="text-xs uppercase tracking-wide text-[#667781] mb-2">
                    Suggested
                  </div>
                  {contactsLoading ? (
                    <div className="py-4 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#25D366]"></div>
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="text-sm text-[#667781]">No contacts found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[35dvh] overflow-auto pr-1">
                      {contacts.slice(0, 8).map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleStartChat(contact.id)}
                          className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-[#f7f9f9]"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold">
                            {contact.avatar ? (
                              <img
                                src={contact.avatar}
                                alt={contact.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              contact.name?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#111b21]">{contact.name}</p>
                            <p className="text-xs text-[#667781]">
                              {contact.username ? `@${contact.username}` : contact.email}
                            </p>
                          </div>
                          <span className="text-xs text-[#25D366] font-medium">Chat</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {userLoading ? (
              <div className="py-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]"></div>
              </div>
            ) : userResults.length === 0 ? (
              userQuery.trim() ? (
                <p className="text-sm text-[#667781]">No users found.</p>
              ) : null
            ) : (
              <div className="space-y-2 max-h-[45dvh] overflow-auto pr-1">
                {userResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleStartChat(result.id)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-[#f7f9f9]"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold">
                      {result.avatar ? (
                        <img
                          src={result.avatar}
                          alt={result.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        result.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#111b21]">{result.name}</p>
                      <p className="text-xs text-[#667781]">
                        {result.username ? `@${result.username}` : result.email}
                      </p>
                    </div>
                    <span className="text-xs text-[#25D366] font-medium">Chat</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



