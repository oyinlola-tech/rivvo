import { useEffect, useState } from "react";
import { api, StatusGroupDto } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, VolumeX, X } from "lucide-react";

export default function Status() {
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const { user } = useAuth();
  const [unviewed, setUnviewed] = useState<StatusGroupDto[]>([]);
  const [viewed, setViewed] = useState<StatusGroupDto[]>([]);
  const [muted, setMuted] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openGroup, setOpenGroup] = useState<StatusGroupDto | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [storyTick, setStoryTick] = useState(0);

  const loadStatuses = async () => {
    setLoading(true);
    const response = await api.getStatuses();
    if (response.success && response.data) {
      setUnviewed(response.data.unviewed || []);
      setViewed(response.data.viewed || []);
      setMuted(response.data.muted || []);
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

  const handleOpenGroup = async (group: StatusGroupDto) => {
    setOpenGroup(group);
    const firstUnseenIndex = group.statuses.findIndex(
      (status) => !status.viewedAt && group.user.id !== user?.id
    );
    setActiveIndex(firstUnseenIndex >= 0 ? firstUnseenIndex : 0);
    setStoryTick((prev) => prev + 1);
    const unseen = group.statuses.filter((s) => !s.viewedAt && group.user.id !== user?.id);
    await Promise.all(unseen.map((status) => api.markStatusViewed(status.id)));
    if (unseen.length) {
      await loadStatuses();
    }
  };

  const handleMute = async (userId: string) => {
    await api.muteStatusUser(userId);
    await loadStatuses();
  };

  const handleUnmute = async (userId: string) => {
    await api.unmuteStatusUser(userId);
    await loadStatuses();
  };

  const activeStatus = openGroup?.statuses?.[activeIndex] || null;
  const storyDurationMs = activeStatus?.mediaType?.startsWith("video/") ? 10000 : 6500;

  useEffect(() => {
    if (!openGroup) return;
    if (!activeStatus) return;
    const timer = window.setTimeout(() => {
      if (!openGroup) return;
      if (activeIndex < openGroup.statuses.length - 1) {
        setActiveIndex((prev) => prev + 1);
        setStoryTick((prev) => prev + 1);
      } else {
        setOpenGroup(null);
      }
    }, storyDurationMs);
    return () => window.clearTimeout(timer);
  }, [openGroup, activeIndex, storyDurationMs, activeStatus]);

  const handleNext = () => {
    if (!openGroup) return;
    if (activeIndex < openGroup.statuses.length - 1) {
      setActiveIndex((prev) => prev + 1);
      setStoryTick((prev) => prev + 1);
    } else {
      setOpenGroup(null);
    }
  };

  const handlePrev = () => {
    if (!openGroup) return;
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
      setStoryTick((prev) => prev + 1);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#000e08] md:ml-64">
      <div className="bg-[#000e08] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Status</h1>
      </div>

      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-100px)] pt-6 px-6 pb-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#000e08] mb-3">My Status</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#20A090] to-[#1DA1F2]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={`${mediaBase}${user.avatar}`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase()
                )}
              </div>
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
          <p className="text-xs text-[#797c7b] mt-2">Statuses disappear after 24 hours.</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <h2 className="text-lg font-semibold text-[#000e08] mb-3">Updates</h2>
          {loading ? (
            <div className="text-sm text-[#797c7b]">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-[#20A090]" />
                  <h3 className="text-sm font-semibold text-[#000e08]">Unviewed</h3>
                </div>
                {unviewed.length === 0 ? (
                  <p className="text-xs text-[#797c7b]">No new updates.</p>
                ) : (
                  <div className="space-y-2">
                    {unviewed.map((group) => (
                      <div
                        key={group.user.id}
                        className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50"
                      >
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#20A090] to-[#1DA1F2]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                            {group.user.avatar ? (
                              <img
                                src={`${mediaBase}${group.user.avatar}`}
                                alt={group.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              group.user.name[0].toUpperCase()
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{group.user.name}</p>
                          <p className="text-xs text-[#797c7b]">
                            {group.statuses.length} update{group.statuses.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {group.user.id !== user?.id && (
                          <button
                            onClick={() => handleMute(group.user.id)}
                            className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700"
                          >
                            Mute
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenGroup(group)}
                          className="text-xs px-2 py-1 rounded-md bg-[#20A090] text-white"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <EyeOff size={16} className="text-[#797c7b]" />
                  <h3 className="text-sm font-semibold text-[#000e08]">Viewed</h3>
                </div>
                {viewed.length === 0 ? (
                  <p className="text-xs text-[#797c7b]">No viewed updates.</p>
                ) : (
                  <div className="space-y-2">
                    {viewed.map((group) => (
                      <div
                        key={group.user.id}
                        className="flex items-center gap-3 p-3 border rounded-xl"
                      >
                        <div className="p-0.5 rounded-full bg-gray-300">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                            {group.user.avatar ? (
                              <img
                                src={`${mediaBase}${group.user.avatar}`}
                                alt={group.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              group.user.name[0].toUpperCase()
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{group.user.name}</p>
                          <p className="text-xs text-[#797c7b]">
                            {group.statuses.length} update{group.statuses.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {group.user.id !== user?.id && (
                          <button
                            onClick={() => handleMute(group.user.id)}
                            className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700"
                          >
                            Mute
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenGroup(group)}
                          className="text-xs px-2 py-1 rounded-md border"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {muted.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <VolumeX size={16} className="text-[#797c7b]" />
                    <h3 className="text-sm font-semibold text-[#000e08]">Muted</h3>
                  </div>
                  <div className="space-y-2">
                    {muted.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-3 border rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-bold">
                          {m.avatar ? (
                            <img
                              src={`${mediaBase}${m.avatar}`}
                              alt={m.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            m.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-xs text-[#797c7b]">Muted</p>
                        </div>
                        <button
                          onClick={() => handleUnmute(m.id)}
                          className="text-xs px-2 py-1 rounded-md bg-[#20A090] text-white"
                        >
                          Unmute
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
      {openGroup && (
        <div className="fixed inset-0 z-50 bg-black text-white">
        <style>
          {`@keyframes status-progress { from { width: 0%; } to { width: 100%; } }`}
        </style>
        <div className="absolute top-4 left-4 right-4 flex gap-1">
          {openGroup.statuses.map((status, idx) => {
            const isDone = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <div key={`${status.id}-${storyTick}-${idx}`} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width: isDone ? "100%" : isActive ? "100%" : "0%",
                    animation: isActive ? `status-progress ${storyDurationMs}ms linear` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#20A090] to-[#1DA1F2]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] overflow-hidden flex items-center justify-center text-xs font-bold">
                {openGroup.user.avatar ? (
                  <img
                    src={`${mediaBase}${openGroup.user.avatar}`}
                    alt={openGroup.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  openGroup.user.name[0].toUpperCase()
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">{openGroup.user.name}</div>
              {activeStatus?.createdAt && (
                <div className="text-xs text-white/70">
                  {new Date(activeStatus.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpenGroup(null)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Close status"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={handlePrev}
          className="absolute inset-y-0 left-0 w-1/3"
          aria-label="Previous status"
        />
        <button
          onClick={handleNext}
          className="absolute inset-y-0 right-0 w-1/3"
          aria-label="Next status"
        />

        <div className="absolute inset-0 flex items-center justify-center px-6 pt-20 pb-10">
          <div className="w-full max-w-xl">
            {activeStatus?.text && (
              <p className="text-lg font-medium mb-4">{activeStatus.text}</p>
            )}
            {activeStatus?.mediaUrl && activeStatus.mediaType?.startsWith("image/") && (
              <img
                src={`${mediaBase}${activeStatus.mediaUrl}`}
                alt="status"
                className="w-full rounded-2xl object-cover max-h-[70vh]"
              />
            )}
            {activeStatus?.mediaUrl && activeStatus.mediaType?.startsWith("video/") && (
              <video className="w-full rounded-2xl max-h-[70vh]" controls>
                <source src={`${mediaBase}${activeStatus.mediaUrl}`} />
              </video>
            )}
          </div>
        </div>
        </div>
      )}
    </>
  );
}
