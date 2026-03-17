import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { Plus, Search, Bell } from "lucide-react";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";

interface Group {
  id: string;
  name: string;
  description?: string | null;
  isPrivate?: boolean;
  ownerId?: string;
  role?: string;
}

export default function Groups() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "discover">("my");
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setError("");
    const response = await api.listGroups();
    if (response.success && response.data) {
      setGroups(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load groups");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    const response = await api.createGroup({ name: name.trim(), description, isPrivate });
    if (response.success && response.data?.id) {
      setShowCreate(false);
      setName("");
      setDescription("");
      setIsPrivate(false);
      await loadGroups();
      navigate(`/groups/${response.data.id}`);
    } else if (!response.success) {
      setError(response.error || "Failed to create group");
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    const response = await api.searchPublicGroups(query);
    if (response.success && response.data) {
      setSearchResults(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to search groups");
    }
  };

  const handleJoinPublic = async (groupId: string) => {
    const response = await api.joinPublicGroup(groupId);
    if (response.success) {
      await loadGroups();
      navigate(`/groups/${groupId}`);
    } else if (!response.success) {
      setError(response.error || "Failed to join group");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b141a] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Groups</h1>
            <p className="text-xs text-white/60">WhatsApp-style communities</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openNotificationsSheet}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F04A4C] text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreate((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
            >
              <Plus size={16} /> Create
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {(["my", "discover"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-full text-sm ${
                tab === value ? "bg-[#1a8c7a] text-white" : "bg-white/10 text-white/80"
              }`}
            >
              {value === "my" ? "My groups" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#f0f2f5] rounded-t-[40px] min-h-[calc(100dvh-120px)] pt-6">
        {error && <p className="px-6 text-red-600 text-sm">{error}</p>}

        {showCreate && (
          <div className="mx-6 mb-6 p-4 rounded-2xl bg-white shadow-sm border border-black/5">
            <h2 className="font-semibold mb-2 text-[#111b21]">Create group</h2>
            <input
              className="w-full px-3 py-2 border border-black/10 rounded-xl mb-2 bg-white"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2 border border-black/10 rounded-xl mb-3 bg-white"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  !isPrivate
                    ? "bg-[#e7f6f3] border-[#1a8c7a] text-[#0a5c50]"
                    : "bg-white border-black/10 text-[#667781]"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  isPrivate
                    ? "bg-[#fef3f2] border-[#f04a4c] text-[#a61f2a]"
                    : "bg-white border-black/10 text-[#667781]"
                }`}
              >
                Private
              </button>
              <span className="text-xs text-[#667781]">
                {isPrivate ? "Invite + approval" : "Anyone can join"}
              </span>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
            >
              Create
            </button>
          </div>
        )}

        {tab === "discover" && (
          <div className="px-6 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full pl-10 pr-3 py-2 border border-black/10 rounded-full bg-white"
                placeholder="Search public groups"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : tab === "my" ? (
          groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No groups yet</div>
          ) : (
            <div className="bg-white mx-4 rounded-2xl shadow-sm overflow-hidden">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full px-5 py-4 text-left hover:bg-[#f7f9fa] flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center font-semibold">
                    {(group.name || "G").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#111b21]">{group.name}</h3>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          group.isPrivate
                            ? "bg-[#fef3f2] text-[#a61f2a]"
                            : "bg-[#e7f6f3] text-[#0a5c50]"
                        }`}
                      >
                        {group.isPrivate ? "Private" : "Public"}
                      </span>
                    </div>
                    <p className="text-sm text-[#667781]">
                      {group.role || "member"} • {group.isPrivate ? "Invite only" : "Open to all"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No results</div>
        ) : (
          <div className="bg-white mx-4 rounded-2xl shadow-sm overflow-hidden">
            {searchResults.map((group) => (
              <div key={group.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center font-semibold">
                    {(group.name || "G").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#111b21]">{group.name}</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e7f6f3] text-[#0a5c50]">
                        Public
                      </span>
                    </div>
                    <p className="text-sm text-[#667781]">{group.description || "No description"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinPublic(group.id)}
                  className="px-4 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





