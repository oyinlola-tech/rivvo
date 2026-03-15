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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Blocked Users</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366]"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No blocked users</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {blocks.map((row, index) => (
            <div key={`${row.blocker.id}-${row.blocked.id}-${index}`} className="p-4">
              <p className="font-semibold">
                {row.blocker.name} blocked {row.blocked.name}
              </p>
              <p className="text-sm text-gray-600">
                {row.blocker.email} â†’ {row.blocked.email}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

