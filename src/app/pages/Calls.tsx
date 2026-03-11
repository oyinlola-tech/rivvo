import { useState, useEffect } from "react";
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";

interface CallLog {
  id: string;
  user: {
    name: string;
    avatar?: string;
    verified: boolean;
    isModerator: boolean;
  };
  type: "video" | "audio";
  direction: "incoming" | "outgoing" | "missed";
  timestamp: string;
  duration?: number;
}

export default function Calls() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    const response = await api.getCallHistory();
    if (response.success && response.data) {
      setCalls(response.data);
    }
    setLoading(false);
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
    <div className="min-h-screen bg-[#000e08] md:ml-64">
      {/* Header */}
      <div className="bg-[#000e08] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Calls</h1>
      </div>

      {/* Calls List */}
      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-100px)] pt-6">
        <div className="px-6 mb-4">
          <h2 className="font-semibold text-lg">Recent</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20A090]"></div>
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
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
                      <h3 className="font-semibold text-[#000e08]">{call.user.name}</h3>
                      {call.user.verified && (
                        <VerificationBadge type={call.user.isModerator ? "mod" : "user"} size="sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#797c7b]">
                      {getCallIcon(call.direction)}
                      <span>{formatTime(call.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <Phone size={20} className="text-[#797C7B]" />
                    </button>
                    <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <Video size={20} className="text-[#797C7B]" />
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
