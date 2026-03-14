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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">User Search</h1>
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 px-3 py-2 border rounded-lg"
          placeholder="Search by name, email, or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-[#20A090] text-white">
          Search
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {results.length === 0 ? (
        <p className="text-gray-500">No results</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {results.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
              </div>
              <button
                onClick={() => handleToggleStatus(user.id, user.status)}
                className="px-3 py-1 rounded-lg border text-sm"
              >
                {user.status === "active" ? "Suspend" : "Unsuspend"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
