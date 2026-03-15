import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";
import { UserPlus, MessageCircle } from "lucide-react";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const response = await api.getUserPublicProfile(id);
      if (response.success && response.data) {
        setProfile(response.data);
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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.[0]?.toUpperCase()
              )}
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
