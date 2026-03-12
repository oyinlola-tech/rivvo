import { useState, useEffect } from "react";
import { Search, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string;
  online: boolean;
  verified: boolean;
  isModerator: boolean;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [results, setResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setResults([]);
      return;
    }

    const isEmail = query.includes("@");
    const digits = query.replace(/\D/g, "");
    const isPhone = digits.length >= 7;

    if (!isEmail && !isPhone) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      const response = await api.searchUsers(query);
      if (response.success && response.data) {
        setResults(response.data as Contact[]);
      } else {
        setResults([]);
      }
      setSearching(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

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

  const filteredContacts = contacts.filter((contact) => {
    const q = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q) ||
      (contact.phone ? contact.phone.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="min-h-screen bg-[#000e08] md:ml-64">
      {/* Header */}
      <div className="bg-[#000e08] sticky top-0 z-10">
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
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#20A090]"
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="bg-white dark:bg-white rounded-t-[40px] pt-6">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20A090]"></div>
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name[0].toUpperCase()
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#000e08]">{user.name}</h3>
                        {user.verified && (
                          <VerificationBadge type={user.isModerator ? "mod" : "user"} size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-[#797c7b]">{user.email}</p>
                      {user.phone && <p className="text-xs text-[#797c7b]">{user.phone}</p>}
                    </div>
                    <button
                      onClick={() => api.addContact(user.id).then(loadContacts)}
                      className="px-3 py-2 rounded-lg bg-[#20A090] text-white text-sm hover:bg-[#1a8c7a] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts List */}
      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-160px)] pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20A090]"></div>
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        contact.name[0].toUpperCase()
                      )}
                    </div>
                    {contact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0FE16D] rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#000e08]">{contact.name}</h3>
                      {contact.verified && (
                        <VerificationBadge type={contact.isModerator ? "mod" : "user"} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-[#797c7b]">{contact.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
