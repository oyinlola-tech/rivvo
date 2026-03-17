import { useEffect, useState } from "react";
import { api, StatusGroupDto } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, VolumeX, X, Plus, Image as ImageIcon, SendHorizontal, Bell, Smile } from "lucide-react";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";
import { readCache, writeCache } from "../lib/cache";
import { preloadImages } from "../lib/imageCache";
import EmojiPicker from "../components/EmojiPicker";

export default function Status() {
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
  const [posting, setPosting] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { unreadCount } = useNotifications();

  const loadStatuses = async () => {
    const cacheKey = user?.id ? `statuses:${user.id}` : "statuses:guest";
    const cached = readCache<{
      unviewed: StatusGroupDto[];
      viewed: StatusGroupDto[];
      muted: { id: string; name: string; avatar?: string | null }[];
    }>(cacheKey, 60_000);
    if (cached) {
      setUnviewed(cached.unviewed || []);
      setViewed(cached.viewed || []);
      setMuted(cached.muted || []);
      setLoading(false);
      preloadImages([
        ...cached.unviewed.map((group) => group.user.avatar),
        ...cached.viewed.map((group) => group.user.avatar),
        ...cached.muted.map((m) => m.avatar),
      ]);
      return;
    }

    setLoading(true);
    const response = await api.getStatuses();
    if (response.success && response.data) {
      setUnviewed(response.data.unviewed || []);
      setViewed(response.data.viewed || []);
      setMuted(response.data.muted || []);
      setError("");
      writeCache(cacheKey, {
        unviewed: response.data.unviewed || [],
        viewed: response.data.viewed || [],
        muted: response.data.muted || [],
      });
      preloadImages([
        ...(response.data.unviewed || []).map((group) => group.user.avatar),
        ...(response.data.viewed || []).map((group) => group.user.avatar),
        ...(response.data.muted || []).map((m) => m.avatar),
      ]);
    } else {
      setError(response.error || "Failed to load status");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatuses();
  }, [user?.id]);

  const handleCreate = async () => {
    if (!text.trim() && !file) {
      setError("Add text or media to post a status.");
      return;
    }
    setPosting(true);
    const response = await api.createStatus({ text: text.trim(), media: file || undefined });
    if (response.success) {
      setText("");
      setFile(null);
      setError("");
      await loadStatuses();
    } else {
      setError(response.error || "Failed to create status");
    }
    setPosting(false);
  };

  const handleOpenGroup = async (group: StatusGroupDto) => {
    setOpenGroup(group);
    const firstUnseenIndex = group.statuses.findIndex(
      (status) => !status.viewedAt && group.user.id !== user?.id
    );
    setActiveIndex(firstUnseenIndex >= 0 ? firstUnseenIndex : 0);
    setStoryTick((prev) => prev + 1);
    setMediaReady(false);
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
    if (!activeStatus) {
      setMediaReady(false);
      return;
    }
    if (activeStatus.mediaUrl && activeStatus.mediaType?.startsWith("image/")) {
      setMediaReady(false);
      return;
    }
    if (activeStatus.mediaUrl && activeStatus.mediaType?.startsWith("video/")) {
      setMediaReady(false);
      return;
    }
    setMediaReady(true);
  }, [activeStatus]);

  useEffect(() => {
    if (!openGroup) return;
    if (!activeStatus) return;
    if (!mediaReady) return;
    const timer = window.setTimeout(() => {
      if (!openGroup) return;
      if (activeIndex < openGroup.statuses.length - 1) {
        setActiveIndex((prev) => prev + 1);
        setStoryTick((prev) => prev + 1);
        setMediaReady(false);
      } else {
        setOpenGroup(null);
      }
    }, storyDurationMs);
    return () => window.clearTimeout(timer);
  }, [openGroup, activeIndex, storyDurationMs, activeStatus, mediaReady]);

  const handleNext = () => {
    if (!openGroup) return;
    if (!mediaReady) return;
    if (activeIndex < openGroup.statuses.length - 1) {
      setActiveIndex((prev) => prev + 1);
      setStoryTick((prev) => prev + 1);
      setMediaReady(false);
    } else {
      setOpenGroup(null);
    }
  };

  const handlePrev = () => {
    if (!openGroup) return;
    if (!mediaReady) return;
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
      setStoryTick((prev) => prev + 1);
      setMediaReady(false);
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
      if (!mediaReady) return;
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
  }, [openGroup, handleNext, handlePrev, mediaReady]);

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
      <div className="min-h-[100dvh] bg-[#f0f2f5] md:ml-64">
      <div className="bg-[#1a8c7a] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Status</h1>
            <p className="text-xs text-white/70 mt-1">Share quick updates with your contacts</p>
          </div>
          <button
            onClick={openNotificationsSheet}
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F04A4C] text-white text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-t-[32px] min-h-[calc(100dvh-100px)] pt-6 px-6 pb-10 border border-[#e6e6e6]">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#111b21]">My Status</h2>
            <span className="text-xs text-[#667781]">24-hour updates</span>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-[#f7f9f9] p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#1a8c7a] to-[#1a8c7a]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      user?.name?.[0]?.toUpperCase()
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1a8c7a] text-white flex items-center justify-center border-2 border-white">
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
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
                rows={3}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-[#1a8c7a] px-4 py-2 text-sm text-[#1a8c7a] hover:bg-[#1a8c7a]/10 cursor-pointer">
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
                    className="text-[#1a8c7a] hover:underline"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={posting}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#1a8c7a] px-5 py-2.5 text-white text-sm font-medium shadow-sm hover:bg-[#1a8c7a] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <SendHorizontal size={16} />
                {posting ? "Posting..." : "Post"}
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
                  <Eye size={16} className="text-[#1a8c7a]" />
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
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#1a8c7a] to-[#1a8c7a]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                            {group.user.avatar ? (
                              <img
                                src={group.user.avatar}
                                alt={group.user.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
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
                          className="text-xs px-3 py-1.5 rounded-full bg-[#1a8c7a] text-white"
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
                                src={group.user.avatar}
                                alt={group.user.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
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
                              src={m.avatar}
                              alt={m.name}
                              className="w-full h-full rounded-full object-cover"
                              loading="lazy"
                              decoding="async"
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
                          className="text-xs px-3 py-1.5 rounded-full bg-[#1a8c7a] text-white"
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
                      animation: isActive && mediaReady ? `status-progress ${storyDurationMs}ms linear` : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute top-6 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#1a8c7a] to-[#1a8c7a]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] overflow-hidden flex items-center justify-center text-xs font-bold">
                  {openGroup.user.avatar ? (
                    <img
                      src={openGroup.user.avatar}
                      alt={openGroup.user.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      decoding="async"
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
            className={`absolute inset-y-0 left-0 w-1/3 ${mediaReady ? "" : "pointer-events-none"}`}
            aria-label="Previous status"
            aria-disabled={!mediaReady}
          />
          <button
            onClick={handleNext}
            className={`absolute inset-y-0 right-0 w-1/3 ${mediaReady ? "" : "pointer-events-none"}`}
            aria-label="Next status"
            aria-disabled={!mediaReady}
          />

          <div className="absolute inset-0 flex items-center justify-center px-6 pt-20 pb-24">
            <div className="w-full max-w-xl relative">
              {activeStatus?.text && (
                <p className="text-lg font-medium mb-4">{activeStatus.text}</p>
              )}
              {activeStatus?.mediaUrl && activeStatus.mediaType?.startsWith("image/") && (
                <img
                  src={activeStatus.mediaUrl}
                  alt="status"
                  className="w-full rounded-2xl object-cover max-h-[70vh]"
                  loading="eager"
                  decoding="async"
                  onLoad={() => setMediaReady(true)}
                  onError={() => setMediaReady(true)}
                />
              )}
              {activeStatus?.mediaUrl && activeStatus.mediaType?.startsWith("video/") && (
                <video
                  className="w-full rounded-2xl max-h-[70vh]"
                  controls
                  preload="auto"
                  onLoadedData={() => setMediaReady(true)}
                  onCanPlay={() => setMediaReady(true)}
                  onError={() => setMediaReady(true)}
                >
                  <source src={activeStatus.mediaUrl} />
                </video>
              )}
              {!mediaReady && activeStatus?.mediaUrl && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <p className="text-xs text-white/80">Loading status...</p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="mx-auto max-w-xl relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/15"
                aria-label="Emoji"
              >
                <Smile size={18} />
              </button>
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={
                  openGroup.user.id === user?.id ? "You're viewing your status" : "Reply privately"
                }
                disabled={openGroup.user.id === user?.id}
                className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
              />
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-0 z-20">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setReplyText((prev) => `${prev}${emoji}`);
                      setShowEmojiPicker(false);
                    }}
                    variant="dark"
                  />
                </div>
              )}
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




