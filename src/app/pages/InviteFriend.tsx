import { useState } from "react";
import { Bell, Link2 } from "lucide-react";
import { api } from "../lib/api";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";

export default function InviteFriend() {
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { unreadCount } = useNotifications();

  const handleCreateInvite = async () => {
    setLoading(true);
    setMessage("");
    const response = await api.createUserInvite();
    if (response.success && response.data?.token) {
      const link = `${window.location.origin}/invite/user/${response.data.token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
      setMessage("Invite link copied to clipboard.");
    } else {
      setMessage(response.error || "Failed to create invite link.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Invite a Friend</h1>
          <button
            onClick={openNotificationsSheet}
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
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

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6 px-6 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111b21] mb-2">Share Rivvo</h2>
          <p className="text-sm text-[#667781] mb-4">
            Invite your friends to join Rivvo and start chatting.
          </p>

          <button
            onClick={handleCreateInvite}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1a8c7a] text-white font-medium disabled:opacity-50"
          >
            <Link2 size={18} />
            {loading ? "Creating link..." : "Create invite link"}
          </button>

          {inviteLink && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-[#f7f9f9] p-4 text-sm text-[#111b21] break-all">
              {inviteLink}
            </div>
          )}
          {message && <p className="mt-3 text-sm text-[#1a8c7a]">{message}</p>}
        </div>
      </div>
    </div>
  );
}
