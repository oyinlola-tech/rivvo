import { useEffect, useState } from "react";
import { api, StatusGroupDto } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, VolumeX, X, Plus, Image as ImageIcon, SendHorizontal } from "lucide-react";

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
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");

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

  useEffect(() => {
    if (!openGroup) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setReplyText("");
    setReplyError("");
    setReplySending(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroup(null);
        return;
      }
      if (event.key === "ArrowRight") {
        handleNext();
      }
      if (event.key === "ArrowLeft") {
        handlePrev();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openGroup, handleNext, handlePrev]);

  const handleReplySend = async () => {
    if (!openGroup || !replyText.trim()) return;
    if (openGroup.user.id === user?.id) {
      setReplyError("You can't reply to your own status.");
      return;
    }
    setReplySending(true);
    setReplyError("");
    const conversation = await api.getOrCreateConversation(openGroup.user.id);
    if (!conversation.success || !conversation.data?.id) {
      setReplySending(false);
      setReplyError(conversation.error || "Unable to start conversation");
      return;
    }
    const response = await api.sendMessage(conversation.data.id, replyText.trim());
    if (!response.success) {
      setReplySending(false);
      setReplyError(response.error || "Failed to send reply");
      return;
    }
    setReplySending(false);
    setReplyText("");
  };

  return (
    <>
      <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Status</h1>
        <p className="text-xs text-white/70 mt-1">Share quick updates with your contacts</p>
      </div>

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6 px-6 pb-10">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#111b21]">My Status</h2>
            <span className="text-xs text-[#667781]">24-hour updates</span>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-[#f7f9f9] p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#25D366] to-[#1DA1F2]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
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
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center border-2 border-white">
                  <Plus size={14} />
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-[#667781]">Tap to add a photo, video, or text update</p>
              </div>
            </div>
            <div className="mt-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a status"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                rows={3}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-[#25D366] px-4 py-2 text-sm text-[#25D366] hover:bg-[#25D366]/10 cursor-pointer">
                <ImageIcon size={16} />
                Add media
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-[#54656f] border border-gray-200">
                  <span className="max-w-[180px] truncate">{file.name}</span>
                  <button
                    onClick={() => setFile(null)}
                    className="text-[#25D366] hover:underline"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              )}
              <button
                onClick={handleCreate}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-white text-sm font-medium shadow-sm hover:bg-[#128C7E]"
              >
                <SendHorizontal size={16} />
                Post
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <h2 className="text-lg font-semibold text-[#111b21] mb-3">Updates</h2>
          {loading ? (
            <div className="text-sm text-[#667781]">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-[#25D366]" />
                  <h3 className="text-sm font-semibold text-[#111b21]">Recent</h3>
                </div>
                {unviewed.length === 0 ? (
                  <p className="text-xs text-[#667781]">No new updates.</p>
                ) : (
                  <div className="space-y-2">
                    {unviewed.map((group) => (
                      <div
                        key={group.user.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white hover:bg-[#f7f9f9] shadow-sm"
                      >
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#25D366] to-[#1DA1F2]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
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
                          <p className="text-xs text-[#667781]">
                            {group.statuses.length} update{group.statuses.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {group.user.id !== user?.id && (
                          <button
                            onClick={() => handleMute(group.user.id)}
                            className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-[#54656f]"
                          >
                            Mute
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenGroup(group)}
                          className="text-xs px-3 py-1.5 rounded-full bg-[#25D366] text-white"
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
                  <EyeOff size={16} className="text-[#667781]" />
                  <h3 className="text-sm font-semibold text-[#111b21]">Viewed</h3>
                </div>
                {viewed.length === 0 ? (
                  <p className="text-xs text-[#667781]">No viewed updates.</p>
                ) : (
                  <div className="space-y-2">
                    {viewed.map((group) => (
                      <div
                        key={group.user.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white"
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
                          <p className="text-xs text-[#667781]">
                            {group.statuses.length} update{group.statuses.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {group.user.id !== user?.id && (
                          <button
                            onClick={() => handleMute(group.user.id)}
                            className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700"
                          >
                            Mute
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenGroup(group)}
                          className="text-xs px-3 py-1.5 rounded-full border border-gray-200"
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
                    <VolumeX size={16} className="text-[#667781]" />
                    <h3 className="text-sm font-semibold text-[#111b21]">Muted</h3>
                  </div>
                  <div className="space-y-2">
                    {muted.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white"
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
                          <p className="text-xs text-[#667781]">Muted</p>
                        </div>
                        <button
                          onClick={() => handleUnmute(m.id)}
                          className="text-xs px-3 py-1.5 rounded-full bg-[#25D366] text-white"
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
          <div className="absolute top-3 left-3 right-3 flex gap-1">
            {openGroup.statuses.map((status, idx) => {
              const isDone = idx < activeIndex;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={`${status.id}-${storyTick}-${idx}`}
                  className="h-0.5 flex-1 bg-white/25 rounded-full overflow-hidden"
                >
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

          <div className="absolute top-6 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#25D366] to-[#1DA1F2]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] overflow-hidden flex items-center justify-center text-xs font-bold">
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
                  <div className="text-[11px] text-white/70">
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

          <div className="absolute inset-0 flex items-center justify-center px-6 pt-20 pb-24">
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

          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="mx-auto max-w-xl flex items-center gap-3">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={
                  openGroup.user.id === user?.id ? "You're viewing your status" : "Reply privately"
                }
                disabled={openGroup.user.id === user?.id}
                className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
              <button
                className="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white disabled:opacity-50"
                aria-label="Send reply"
                onClick={handleReplySend}
                disabled={replySending || !replyText.trim() || openGroup.user.id === user?.id}
              >
                <SendHorizontal size={18} />
              </button>
            </div>
            {replyError && (
              <div className="mx-auto max-w-xl mt-2 text-xs text-red-200">{replyError}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}



