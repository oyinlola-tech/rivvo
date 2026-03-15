import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { Plus, Search } from "lucide-react";

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
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white"
          >
            <Plus size={16} /> Create
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {(["my", "discover"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-full text-sm ${
                tab === value ? "bg-[#1a8c7a] text-white" : "bg-white/10 text-white"
              }`}
            >
              {value === "my" ? "My groups" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-120px)] pt-6">
        {error && <p className="px-6 text-red-600 text-sm">{error}</p>}

        {showCreate && (
          <div className="mx-6 mb-6 p-4 rounded-xl border border-gray-200">
            <h2 className="font-semibold mb-2">Create Group</h2>
            <input
              className="w-full px-3 py-2 border rounded-lg mb-2"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2 border rounded-lg mb-2"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private group (join by invite + approval)
            </label>
            <button
              onClick={handleCreate}
              className="mt-3 px-4 py-2 rounded-lg bg-[#1a8c7a] text-white"
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
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
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
            <div className="divide-y divide-gray-100">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-[#111b21]">{group.name}</h3>
                  <p className="text-sm text-[#667781]">
                    {group.isPrivate ? "Private" : "Public"} â€¢ {group.role || "member"}
                  </p>
                </button>
              ))}
            </div>
          )
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No results</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {searchResults.map((group) => (
              <div key={group.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#111b21]">{group.name}</h3>
                  <p className="text-sm text-[#667781]">{group.description || "No description"}</p>
                </div>
                <button
                  onClick={() => handleJoinPublic(group.id)}
                  className="px-4 py-2 rounded-lg bg-[#1a8c7a] text-white"
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




