import { useState, useEffect } from "react";
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Link as LinkIcon, Bell } from "lucide-react";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";

interface CallLog {
  id: string;
  user: {
    name: string;
    avatar?: string;
    verified: boolean;
    isVerifiedBadge: boolean;
    isModerator: boolean;
    isAdmin: boolean;
  };
  type: "video" | "audio";
  direction: "incoming" | "outgoing" | "missed";
  timestamp: string;
  duration?: number;
}

export default function Calls() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [scope, setScope] = useState<"direct" | "group">("direct");
  const [type, setType] = useState<"audio" | "video">("audio");
  const [groupId, setGroupId] = useState("");
  const [callLink, setCallLink] = useState("");
  const { unreadCount } = useNotifications();

  useEffect(() => {
    loadCalls();
    loadGroups();
  }, []);

  const loadCalls = async () => {
    setError("");
    const response = await api.getCallHistory();
    if (response.success && response.data) {
      setCalls(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load call history");
    }
    setLoading(false);
  };

  const loadGroups = async () => {
    const response = await api.listGroups();
    if (response.success && response.data) {
      setGroups(response.data);
    }
  };

  const handleCreateCallLink = async () => {
    setError("");
    if (scope === "group" && !groupId) {
      setError("Please select a group");
      return;
    }
    const response = await api.createCallLink({
      type,
      scope,
      groupId: scope === "group" ? groupId : undefined,
    });
    if (response.success && response.data?.joinUrl) {
      setCallLink(response.data.joinUrl);
      await navigator.clipboard.writeText(response.data.joinUrl);
    } else if (!response.success) {
      setError(response.error || "Failed to create call link");
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString();
  };

  const getCallIcon = (direction: string) => {
    switch (direction) {
      case "incoming":
        return <PhoneIncoming size={16} className="text-[#0FE16D]" />;
      case "outgoing":
        return <PhoneOutgoing size={16} className="text-[#0FE16D]" />;
      case "missed":
        return <PhoneMissed size={16} className="text-[#EA3736]" />;
      default:
        return <Phone size={16} />;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      {/* Header */}
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Calls</h1>
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

      {/* Calls List */}
      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6">
        <div className="px-6 mb-6">
          <h2 className="font-semibold text-lg mb-3">Create call link</h2>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "audio" | "video")}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "direct" | "group")}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="direct">1-to-1</option>
              <option value="group">Group</option>
            </select>
            {scope === "group" && (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleCreateCallLink}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a8c7a] text-white text-sm"
            >
              <LinkIcon size={16} /> Create link
            </button>
          </div>
          {callLink && <p className="text-xs text-gray-600 break-all">{callLink}</p>}
        </div>
        <div className="px-6 mb-4">
          <h2 className="font-semibold text-lg">Recent</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No call history</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {calls.map((call) => (
              <div key={call.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
                    {call.user.avatar ? (
                      <img
                        src={call.user.avatar}
                        alt={call.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      call.user.name[0].toUpperCase()
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#111b21]">{call.user.name}</h3>
                      {(call.user.isVerifiedBadge || call.user.isModerator || call.user.isAdmin) && (
                        <VerificationBadge
                          type={call.user.isModerator || call.user.isAdmin ? "staff" : "user"}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#667781]">
                      {getCallIcon(call.direction)}
                      <span>{formatTime(call.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <Phone size={20} className="text-[#667781]" />
                    </button>
                    <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <Video size={20} className="text-[#667781]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




