import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "../lib/api";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { useNotifications } from "../contexts/NotificationsContext";

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export default function StorageData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    storage: { avatarBytes: number; statusMediaBytes: number; attachmentBytes: number; totalBytes: number };
    network: { messagesSent: number; messagesReceived: number; textBytesSent: number; textBytesReceived: number };
    counts: { contacts: number; statuses: number; attachments: number };
  } | null>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await api.getStorageUsage();
      if (response.success && response.data) {
        setData(response.data);
        setError("");
      } else {
        setError(response.error || "Failed to load storage usage");
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Storage & Data</h1>
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111b21] mb-3">Storage usage</h2>
              <div className="space-y-2 text-sm text-[#667781]">
                <div className="flex items-center justify-between">
                  <span>Profile photo</span>
                  <span className="font-medium text-[#111b21]">
                    {formatBytes(data.storage.avatarBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status media</span>
                  <span className="font-medium text-[#111b21]">
                    {formatBytes(data.storage.statusMediaBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Message attachments</span>
                  <span className="font-medium text-[#111b21]">
                    {formatBytes(data.storage.attachmentBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span>Total</span>
                  <span className="font-semibold text-[#111b21]">
                    {formatBytes(data.storage.totalBytes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111b21] mb-3">Network usage</h2>
              <div className="space-y-2 text-sm text-[#667781]">
                <div className="flex items-center justify-between">
                  <span>Messages sent</span>
                  <span className="font-medium text-[#111b21]">{data.network.messagesSent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Messages received</span>
                  <span className="font-medium text-[#111b21]">{data.network.messagesReceived}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Text sent</span>
                  <span className="font-medium text-[#111b21]">
                    {formatBytes(data.network.textBytesSent)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Text received</span>
                  <span className="font-medium text-[#111b21]">
                    {formatBytes(data.network.textBytesReceived)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111b21] mb-3">Usage summary</h2>
              <div className="space-y-2 text-sm text-[#667781]">
                <div className="flex items-center justify-between">
                  <span>Contacts</span>
                  <span className="font-medium text-[#111b21]">{data.counts.contacts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status posts</span>
                  <span className="font-medium text-[#111b21]">{data.counts.statuses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Attachments sent</span>
                  <span className="font-medium text-[#111b21]">{data.counts.attachments}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
