import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { api, ConversationDto } from "../lib/api";
import { NOTIFICATIONS_SHEET_EVENT } from "../lib/notificationsSheet";
import { VerificationBadge } from "./VerificationBadge";
import { useNotifications } from "../contexts/NotificationsContext";

interface ContactRequest {
  id: string;
  status: string;
  createdAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    username?: string | null;
    isVerifiedBadge: boolean;
    isModerator: boolean;
    isAdmin: boolean;
  };
}

export default function NotificationsSheet() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const { unreadCount, markAllRead } = useNotifications();

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(NOTIFICATIONS_SHEET_EVENT, handler as EventListener);
    return () => window.removeEventListener(NOTIFICATIONS_SHEET_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (isOpen) {
        loadRequestCounts();
      }
    };
    window.addEventListener("contact_requests_updated", handler as EventListener);
    return () => window.removeEventListener("contact_requests_updated", handler as EventListener);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    loadRequestCounts();
    loadContacts();
    loadConversations();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const loadConversations = async () => {
    setConversationsLoading(true);
    const response = await api.getConversations();
    if (response.success && response.data) {
      setConversations(response.data);
    }
    setConversationsLoading(false);
  };

  const loadRequestCounts = async () => {
    setRequestsLoading(true);
    const [incoming] = await Promise.all([
      api.getContactRequests("incoming"),
    ]);
    if (incoming.success && incoming.data) {
      setIncomingRequests(incoming.data as ContactRequest[]);
    }
    setRequestsLoading(false);
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    const response = await api.getContacts();
    if (response.success && response.data) {
      setContacts(response.data);
    }
    setContactsLoading(false);
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

  const handleAcceptRequest = async (requestId: string) => {
    await api.acceptContactRequest(requestId);
    await loadRequestCounts();
    await loadConversations();
    window.dispatchEvent(new CustomEvent("contact_requests_updated"));
  };

  const handleRejectRequest = async (requestId: string) => {
    await api.rejectContactRequest(requestId);
    await loadRequestCounts();
    window.dispatchEvent(new CustomEvent("contact_requests_updated"));
  };

  const handleStartChat = async (userId: string) => {
    setUserError("");
    const response = await api.getOrCreateConversation(userId);
    if (response.success && response.data?.id) {
      setIsOpen(false);
      setUserQuery("");
      setUserResults([]);
      navigate(`/messages/${response.data.id}`);
    } else if (!response.success) {
      setUserError(response.error || "Failed to start chat");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 md:ml-64">
      <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#111b21]">Notifications</h2>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-[#1a8c7a] font-medium disabled:opacity-50"
            >
              Mark all read
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setUserQuery("");
                setUserResults([]);
                setUserError("");
              }}
              className="text-[#667781]"
            >
              Close
            </button>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-[#667781] mb-2">
            Friend requests
          </div>
          {requestsLoading ? (
            <div className="py-3 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a8c7a]"></div>
            </div>
          ) : incomingRequests.length === 0 ? (
            <p className="text-sm text-[#667781]">No new requests.</p>
          ) : (
            <div className="space-y-2">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-semibold overflow-hidden">
                    {request.user?.avatar ? (
                      <img
                        src={request.user.avatar}
                        alt={request.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      request.user?.name?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#111b21]">{request.user?.name}</p>
                      {(request.user?.isVerifiedBadge ||
                        request.user?.isModerator ||
                        request.user?.isAdmin) && (
                        <VerificationBadge
                          type={request.user?.isModerator || request.user?.isAdmin ? "staff" : "user"}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#667781]">{request.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="px-3 py-2 rounded-lg bg-[#1a8c7a] text-white text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mb-2">
          <div className="text-xs uppercase tracking-wide text-[#667781] mb-2">
            Start a new chat
          </div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
            placeholder="Search by name, email, phone, or username"
            className="w-full pl-11 pr-4 py-3 bg-[#f0f2f5] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
          />
        </div>
        {userError && <p className="text-sm text-red-600 mb-3">{userError}</p>}
        {!userQuery.trim() && (
          <>
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wide text-[#667781] mb-2">
                Recent
              </div>
              {conversationsLoading ? (
                <div className="py-3 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a8c7a]"></div>
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-[#667781]">No recent chats yet.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 5).map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/messages/${conversation.id}`);
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-[#f7f9f9]"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-semibold">
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#111b21]">{conversation.user.name}</p>
                          {(conversation.user.isVerifiedBadge ||
                            conversation.user.isModerator ||
                            conversation.user.isAdmin) && (
                            <VerificationBadge
                              type={conversation.user.isModerator || conversation.user.isAdmin ? "staff" : "user"}
                              size="sm"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[#667781]">
                          {conversation.lastMessage.text || "No messages yet"}
                        </p>
                      </div>
                      <span className="text-xs text-[#1a8c7a] font-medium">Open</span>
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a8c7a]"></div>
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-semibold">
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#111b21]">{contact.name}</p>
                          {(contact.isVerifiedBadge ||
                            contact.isModerator ||
                            contact.isAdmin) && (
                            <VerificationBadge
                              type={contact.isModerator || contact.isAdmin ? "staff" : "user"}
                              size="sm"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[#667781]">
                          {contact.username ? `@${contact.username}` : contact.email}
                        </p>
                      </div>
                      <span className="text-xs text-[#1a8c7a] font-medium">Chat</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {userLoading ? (
          <div className="py-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-semibold">
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#111b21]">{result.name}</p>
                    {(result.isVerifiedBadge || result.isModerator || result.isAdmin) && (
                      <VerificationBadge
                        type={result.isModerator || result.isAdmin ? "staff" : "user"}
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#667781]">
                    {result.username ? `@${result.username}` : result.email}
                  </p>
                </div>
                <span className="text-xs text-[#1a8c7a] font-medium">Chat</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
