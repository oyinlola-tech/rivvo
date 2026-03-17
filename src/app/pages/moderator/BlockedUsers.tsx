import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ModeratorBlockedUsers() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await api.getModerationBlocks();
      if (response.success && response.data) {
        setBlocks(response.data);
      } else if (!response.success) {
        setError(response.error || "Failed to load blocks");
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Moderator</p>
          <h1 className="text-2xl font-semibold">Blocked Users</h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No blocked users</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e6e6e6] divide-y divide-[#eef0f2]">
            {blocks.map((row, index) => (
              <div key={`${row.blocker.id}-${row.blocked.id}-${index}`} className="p-4">
                <p className="font-semibold">
                  {row.blocker.name} blocked {row.blocked.name}
                </p>
                <p className="text-sm text-[#5f6d75]">
                  {row.blocker.email} - {row.blocked.email}
                </p>
                <p className="text-xs text-[#7a8a93]">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


