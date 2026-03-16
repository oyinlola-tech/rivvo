import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";
import { UserPlus, MessageCircle, Flag, Ban } from "lucide-react";
import { readCache, writeCache } from "../lib/cache";
import { preloadImage } from "../lib/imageCache";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBlock, setReportBlock] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarTransform, setAvatarTransform] = useState({ scale: 1, x: 0, y: 0 });
  const avatarTouchStartRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const reportSuggestions = [
    "Spam or scam",
    "Harassment or hate speech",
    "Impersonation",
    "Inappropriate content",
    "Other",
  ];

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const cacheKey = `profile:${id}`;
      const cached = readCache<any>(cacheKey, 60_000);
      if (cached) {
        setProfile(cached);
        setLoading(false);
        preloadImage(cached.avatar);
        return;
      }

      setLoading(true);
      const response = await api.getUserPublicProfile(id);
      if (response.success && response.data) {
        setProfile(response.data);
        writeCache(cacheKey, response.data);
        preloadImage(response.data.avatar);
        setError("");
      } else {
        setError(response.error || "Unable to load profile");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleRequest = async () => {
    if (!profile?.id) return;
    setActionLoading(true);
    const response = await api.addContact(profile.id);
    if (response.success) {
      const updated = await api.getUserPublicProfile(profile.id);
      if (updated.success && updated.data) {
        setProfile(updated.data);
      }
    } else {
      setError(response.error || "Unable to send request");
    }
    setActionLoading(false);
  };

  const handleAccept = async () => {
    if (!profile?.id) return;
    setActionLoading(true);
    const requests = await api.getContactRequests("incoming");
    if (requests.success && requests.data) {
      const request = requests.data.find((item: any) => item.user?.id === profile.id);
      if (request) {
        await api.acceptContactRequest(request.id);
      }
    }
    const updated = await api.getUserPublicProfile(profile.id);
    if (updated.success && updated.data) {
      setProfile(updated.data);
    }
    setActionLoading(false);
  };

  const handleMessage = async () => {
    if (!profile?.id) return;
    setActionLoading(true);
    const response = await api.getOrCreateConversation(profile.id);
    if (response.success && response.data?.id) {
      navigate(`/messages/${response.data.id}`);
    } else if (!response.success) {
      setError(response.error || "Unable to start chat");
    }
    setActionLoading(false);
  };

  const handleReportSubmit = async () => {
    if (!profile?.id) return;
    if (!reportReason.trim()) {
      setError("Please select or enter a report reason.");
      return;
    }
    setActionLoading(true);
    const response = await api.reportUser({
      reportedUserId: profile.id,
      reason: reportReason.trim(),
      block: reportBlock,
    });
    if (!response.success) {
      setError(response.error || "Failed to submit report");
    } else {
      setError(reportBlock ? "User reported and blocked" : "Report submitted");
      setReportOpen(false);
      setReportReason("");
      setReportBlock(false);
    }
    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!profile?.id) return;
    const confirmBlock = window.confirm("Block this user? They will not be able to message you.");
    if (!confirmBlock) return;
    setActionLoading(true);
    const response = await api.blockUser(profile.id);
    if (!response.success) {
      setError(response.error || "Failed to block user");
    } else {
      setError("User blocked");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#111b21] md:ml-64 flex items-center justify-center">
        <div className="text-white/80 text-sm">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-[#111b21] md:ml-64 flex items-center justify-center">
        <div className="text-white/80 text-sm">{error || "Profile not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>
      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6 px-6 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (profile.avatar) {
                  setAvatarTransform({ scale: 1, x: 0, y: 0 });
                  setAvatarPreviewOpen(true);
                }
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
              aria-label="View profile photo"
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                profile.name?.[0]?.toUpperCase()
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#111b21]">{profile.name}</h2>
                {(profile.isVerifiedBadge || profile.isModerator || profile.isAdmin) && (
                  <VerificationBadge
                    type={profile.isModerator || profile.isAdmin ? "staff" : "user"}
                    size="sm"
                  />
                )}
              </div>
              {profile.username && (
                <p className="text-sm text-[#667781]">@{profile.username}</p>
              )}
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {profile.contactStatus === "accepted" && (
              <button
                onClick={handleMessage}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a8c7a] px-4 py-2 text-white text-sm font-medium disabled:opacity-50"
              >
                <MessageCircle size={16} />
                Message
              </button>
            )}
            {profile.contactStatus === "incoming" && (
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a8c7a] px-4 py-2 text-white text-sm font-medium disabled:opacity-50"
              >
                <UserPlus size={16} />
                Accept request
              </button>
            )}
            {profile.contactStatus === "outgoing" && (
              <button
                disabled
                className="inline-flex items-center gap-2 rounded-full bg-gray-200 px-4 py-2 text-gray-700 text-sm font-medium"
              >
                Pending request
              </button>
            )}
            {profile.contactStatus === "none" && (
              <button
                onClick={handleRequest}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-full border border-[#1a8c7a] px-4 py-2 text-[#1a8c7a] text-sm font-medium disabled:opacity-50"
              >
                <UserPlus size={16} />
                Send request
              </button>
            )}
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#EA3736] px-4 py-2 text-[#EA3736] text-sm font-medium"
            >
              <Flag size={16} />
              Report
            </button>
            <button
              onClick={handleBlock}
              className="inline-flex items-center gap-2 rounded-full bg-[#EA3736] px-4 py-2 text-white text-sm font-medium"
            >
              <Ban size={16} />
              Block
            </button>
          </div>
        </div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#111b21]">Report user</h3>
                <p className="text-sm text-[#667781]">Select a reason or type your own.</p>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="text-sm text-[#667781]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {reportSuggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setReportReason(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    reportReason === item
                      ? "bg-[#1a8c7a] text-white"
                      : "bg-[#f0f2f5] text-[#111b21]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-[#f0f2f5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
                placeholder="Tell us what happened"
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-[#667781]">
              <input
                type="checkbox"
                checked={reportBlock}
                onChange={(e) => setReportBlock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a8c7a] focus:ring-[#1a8c7a]"
              />
              Also block this user
            </label>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-[#667781]"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-[#EA3736] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
      {avatarPreviewOpen && profile?.avatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: "modal-fade 180ms ease-out" }}
            onClick={() => setAvatarPreviewOpen(false)}
          />
          <div
            className="relative w-full max-w-md text-white"
            style={{ animation: "modal-zoom 200ms ease-out" }}
            onTouchStart={(event) => {
              if (event.touches.length === 2) {
                const [a, b] = event.touches;
                const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                pinchStartRef.current = { dist, scale: avatarTransform.scale };
                return;
              }
              const touch = event.touches[0];
              avatarTouchStartRef.current = touch?.clientY ?? null;
              if (avatarTransform.scale > 1 && touch) {
                dragStartRef.current = {
                  x: touch.clientX,
                  y: touch.clientY,
                  originX: avatarTransform.x,
                  originY: avatarTransform.y,
                };
              }
            }}
            onTouchMove={(event) => {
              if (event.touches.length === 2 && pinchStartRef.current) {
                const [a, b] = event.touches;
                const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                const nextScale = Math.min(3, Math.max(1, (dist / pinchStartRef.current.dist) * pinchStartRef.current.scale));
                setAvatarTransform((prev) => ({ ...prev, scale: nextScale }));
                return;
              }
              const touch = event.touches[0];
              if (dragStartRef.current && touch) {
                const nextX = dragStartRef.current.originX + (touch.clientX - dragStartRef.current.x);
                const nextY = dragStartRef.current.originY + (touch.clientY - dragStartRef.current.y);
                setAvatarTransform((prev) => ({ ...prev, x: nextX, y: nextY }));
                return;
              }
              if (avatarTouchStartRef.current === null) return;
              const currentY = touch?.clientY ?? 0;
              if (currentY - avatarTouchStartRef.current > 120 && avatarTransform.scale <= 1.01) {
                setAvatarPreviewOpen(false);
              }
            }}
            onTouchEnd={() => {
              avatarTouchStartRef.current = null;
              pinchStartRef.current = null;
              dragStartRef.current = null;
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{profile.name}</div>
              <button
                onClick={() => setAvatarPreviewOpen(false)}
                className="text-sm text-white/80"
              >
                Close
              </button>
            </div>
            <div className="w-full aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover transition-transform duration-150"
                loading="eager"
                decoding="async"
                style={{
                  transform: `translate(${avatarTransform.x}px, ${avatarTransform.y}px) scale(${avatarTransform.scale})`,
                }}
                onClick={() =>
                  setAvatarTransform((prev) =>
                    prev.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }
                  )
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
