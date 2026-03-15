import { useState, useEffect } from "react";
import { Search, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { useNavigate } from "react-router";
import { VerificationBadge } from "../components/VerificationBadge";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string;
  online: boolean;
  verified: boolean;
  isVerifiedBadge: boolean;
  isModerator: boolean;
  isAdmin: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string;
  verified: boolean;
  isVerifiedBadge: boolean;
  isModerator: boolean;
  isAdmin: boolean;
}

interface ContactRequest {
  id: string;
  status: string;
  createdAt: string | null;
  user: SearchResult;
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ContactRequest[]>([]);
  const normalizedQuery = searchQuery.trim();
  const usernameQuery = normalizedQuery.startsWith("@")
    ? normalizedQuery.slice(1)
    : normalizedQuery;
  const queryIsEmail = normalizedQuery.includes("@") && !normalizedQuery.startsWith("@");
  const queryIsPhone = normalizedQuery.replace(/\D/g, "").length >= 7;
  const queryIsUsername = /^[a-zA-Z0-9._]{3,32}$/.test(usernameQuery);
  const queryIsName = normalizedQuery.length >= 3;
  const showSearchResults =
    normalizedQuery.length > 0 && (queryIsEmail || queryIsPhone || queryIsUsername || queryIsName);

  useEffect(() => {
    loadContacts();
    loadMuted();
    loadRequests();
  }, []);

  useEffect(() => {
    const handler = () => loadRequests();
    window.addEventListener("contact_requests_updated", handler as EventListener);
    return () => window.removeEventListener("contact_requests_updated", handler as EventListener);
  }, []);

  useEffect(() => {
    const query = queryIsUsername ? usernameQuery : normalizedQuery;
    if (!query || !showSearchResults) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      const response = await api.searchUsers(query);
      if (response.success && response.data) {
        setResults(response.data as SearchResult[]);
      } else {
        setResults([]);
      }
      setSearching(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [normalizedQuery, showSearchResults]);

  const loadContacts = async () => {
    setError("");
    const response = await api.getContacts();
    if (response.success && response.data) {
      setContacts(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load contacts");
    }
    setLoading(false);
  };

  const loadMuted = async () => {
    const response = await api.getStatuses();
    if (response.success && response.data?.muted) {
      setMutedIds(new Set(response.data.muted.map((user) => user.id)));
    }
  };

  const loadRequests = async () => {
    const [incoming, outgoing] = await Promise.all([
      api.getContactRequests("incoming"),
      api.getContactRequests("outgoing"),
    ]);
    if (incoming.success && incoming.data) {
      setIncomingRequests(incoming.data as ContactRequest[]);
    }
    if (outgoing.success && outgoing.data) {
      setOutgoingRequests(outgoing.data as ContactRequest[]);
    }
  };

  const handleToggleMute = async (userId: string) => {
    if (mutedIds.has(userId)) {
      await api.unmuteStatusUser(userId);
    } else {
      await api.muteStatusUser(userId);
    }
    await loadMuted();
  };

  const handleSendRequest = async (userId: string) => {
    await api.addContact(userId);
    await loadRequests();
  };

  const handleAcceptRequest = async (requestId: string) => {
    await api.acceptContactRequest(requestId);
    await loadRequests();
    await loadContacts();
  };

  const handleRejectRequest = async (requestId: string) => {
    await api.rejectContactRequest(requestId);
    await loadRequests();
  };

  const outgoingIds = new Set(outgoingRequests.map((req) => req.user.id));
  const incomingByUser = new Map(incomingRequests.map((req) => [req.user.id, req]));

  const filteredContacts = contacts.filter((contact) => {
    const q = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q) ||
      (contact.phone ? contact.phone.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      {/* Header */}
      <div className="bg-[#111b21] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
            <button className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              <UserPlus className="text-white" size={24} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, @username, email, phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
            />
          </div>
        </div>
      </div>

      {/* Incoming Requests */}
      {!showSearchResults && incomingRequests.length > 0 && (
        <div className="bg-background rounded-t-[40px] pt-6">
          <div className="px-6 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111b21]">Requests</h2>
            <span className="text-xs text-[#667781]">{incomingRequests.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {incomingRequests.map((request) => (
              <div key={request.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
                      {request.user.avatar ? (
                        <img
                          src={request.user.avatar}
                          alt={request.user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        request.user.name[0].toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#111b21]">{request.user.name}</h3>
                      {(request.user.isVerifiedBadge || request.user.isModerator || request.user.isAdmin) && (
                        <VerificationBadge
                          type={request.user.isModerator || request.user.isAdmin ? "staff" : "user"}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-sm text-[#667781]">{request.user.email}</p>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <div className="bg-background rounded-t-[40px] pt-6">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold overflow-hidden"
                        aria-label={`View ${user.name} profile`}
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name[0].toUpperCase()
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#111b21]">{user.name}</h3>
                        {(user.isVerifiedBadge || user.isModerator || user.isAdmin) && (
                          <VerificationBadge
                            type={user.isModerator || user.isAdmin ? "staff" : "user"}
                            size="sm"
                          />
                        )}
                      </div>
                      <p className="text-sm text-[#667781]">{user.email}</p>
                      {user.phone && <p className="text-xs text-[#667781]">{user.phone}</p>}
                    </div>
                    <button
                      onClick={() => {
                        const incoming = incomingByUser.get(user.id);
                        if (incoming) {
                          handleAcceptRequest(incoming.id);
                          return;
                        }
                        handleSendRequest(user.id);
                      }}
                      disabled={outgoingIds.has(user.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        outgoingIds.has(user.id)
                          ? "bg-gray-200 text-gray-700"
                          : "bg-[#1a8c7a] text-white hover:bg-[#1a8c7a]"
                      }`}
                    >
                      {incomingByUser.has(user.id)
                        ? "Accept"
                        : outgoingIds.has(user.id)
                          ? "Pending"
                          : "Request"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts List */}
      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-160px)] pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No contacts found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="relative">
                    <button
                      onClick={() => navigate(`/users/${contact.id}`)}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold overflow-hidden"
                      aria-label={`View ${contact.name} profile`}
                    >
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        contact.name[0].toUpperCase()
                      )}
                    </button>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0FE16D] rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#111b21]">{contact.name}</h3>
                      {(contact.isVerifiedBadge || contact.isModerator || contact.isAdmin) && (
                        <VerificationBadge
                          type={contact.isModerator || contact.isAdmin ? "staff" : "user"}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-sm text-[#667781]">{contact.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggleMute(contact.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      mutedIds.has(contact.id)
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-[#1a8c7a] text-white hover:bg-[#1a8c7a]"
                    }`}
                  >
                    {mutedIds.has(contact.id) ? "Unmute" : "Mute"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




