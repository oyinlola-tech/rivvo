import { useState } from "react";
import { api } from "../../lib/api";

export default function ModeratorUserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    const response = await api.searchModerationUsers(q);
    if (response.success && response.data) {
      setResults(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to search users");
    }
  };

  const handleToggleStatus = async (userId: string, status: "active" | "suspended") => {
    const next = status === "active" ? "suspended" : "active";
    const response = await api.updateModerationUserStatus(userId, next);
    if (!response.success) {
      setError(response.error || "Failed to update user status");
    } else {
      setResults((prev) => prev.map((u) => (u.id === userId ? { ...u, status: next } : u)));
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Moderator</p>
          <h1 className="text-2xl font-semibold">User Search</h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 px-4 py-3 border border-[#d6dbe0] rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]/30"
            placeholder="Search by name, email, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-5 py-3 rounded-full bg-[#1a8c7a] text-white text-sm font-medium"
          >
            Search
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {results.length === 0 ? (
          <p className="text-gray-500">No results</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e6e6e6] divide-y divide-[#eef0f2]">
            {results.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-[#5f6d75]">{user.email}</p>
                  {user.phone && <p className="text-xs text-[#7a8a93]">{user.phone}</p>}
                </div>
                <button
                  onClick={() => handleToggleStatus(user.id, user.status)}
                  className="px-4 py-2 rounded-full border border-[#d6dbe0] text-sm hover:bg-[#f7f9fa]"
                >
                  {user.status === "active" ? "Suspend" : "Unsuspend"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


