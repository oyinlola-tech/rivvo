import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface StatusItem {
  id: string;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  expiresAt: string;
}

interface StatusGroup {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    verified?: boolean;
    isModerator?: boolean;
  };
  statuses: StatusItem[];
}

export default function Status() {
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusGroup[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatuses = async () => {
    setLoading(true);
    const response = await api.getStatuses();
    if (response.success && response.data) {
      setStatuses(response.data);
      setError("");
    } else {
      setError(response.error || "Failed to load status");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handleCreate = async () => {
    if (!text.trim() && !file) return;
    const response = await api.createStatus({ text: text.trim(), media: file || undefined });
    if (response.success) {
      setText("");
      setFile(null);
      await loadStatuses();
    } else {
      setError(response.error || "Failed to create status");
    }
  };

  return (
    <div className="min-h-screen bg-[#000e08] md:ml-64">
      <div className="bg-[#000e08] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Status</h1>
      </div>

      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-100px)] pt-6 px-6 pb-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#000e08] mb-3">My Status</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-xl font-bold">
              {user?.avatar ? (
                <img
                  src={`${mediaBase}${user.avatar}`}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-xs text-[#797c7b]">Share a 24-hour update</p>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full border rounded-lg p-3 text-sm mb-3"
            rows={3}
          />
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-[#20A090] text-white"
            >
              Post Status
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <h2 className="text-lg font-semibold text-[#000e08] mb-3">Recent Updates</h2>
          {loading ? (
            <div className="text-sm text-[#797c7b]">Loading...</div>
          ) : (
            <div className="space-y-6">
              {statuses.map((group) => (
                <div key={group.user.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-sm font-bold">
                      {group.user.avatar ? (
                        <img
                          src={`${mediaBase}${group.user.avatar}`}
                          alt={group.user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        group.user.name[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{group.user.name}</p>
                      <p className="text-xs text-[#797c7b]">
                        {group.statuses.length} update{group.statuses.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {group.statuses.map((status) => (
                      <div key={status.id} className="border rounded-xl p-3">
                        {status.text && <p className="text-sm mb-2">{status.text}</p>}
                        {status.mediaUrl && status.mediaType?.startsWith("image/") && (
                          <img
                            src={`${mediaBase}${status.mediaUrl}`}
                            alt="status"
                            className="w-full rounded-lg object-cover"
                          />
                        )}
                        {status.mediaUrl && status.mediaType?.startsWith("video/") && (
                          <video controls className="w-full rounded-lg">
                            <source src={`${mediaBase}${status.mediaUrl}`} />
                          </video>
                        )}
                        <p className="text-xs text-[#797c7b] mt-2">
                          Expires: {new Date(status.expiresAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
