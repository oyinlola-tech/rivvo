import { useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { openNotificationsSheet } from "../lib/notificationsSheet";
import { Bell } from "lucide-react";
import { useNotifications } from "../contexts/NotificationsContext";

export default function Help() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const { unreadCount } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!subject.trim() || !message.trim()) {
      setStatus("error");
      setFeedback("Please enter a subject and message.");
      return;
    }

    setStatus("loading");
    const response = await api.sendSupportMessage({
      subject: subject.trim(),
      message: message.trim(),
    });
    if (response.success) {
      setStatus("success");
      setFeedback(response.data?.message || "Message sent successfully.");
      setSubject("");
      setMessage("");
    } else {
      setStatus("error");
      setFeedback(response.error || "Failed to send your message.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Help</h1>
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

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-100px)] pt-6">
        <div className="px-6 mb-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111b21] mb-2">Help Center</h2>
            <p className="text-sm text-[#667781] mb-4">
              Find helpful resources, or reach out to the Rivvo team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/privacy"
                className="px-4 py-2 rounded-full bg-[#f0f2f5] text-[#111b21] text-sm hover:bg-[#e6eaee]"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="px-4 py-2 rounded-full bg-[#f0f2f5] text-[#111b21] text-sm hover:bg-[#e6eaee]"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6 mb-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111b21] mb-4">FAQs</h2>
            <div className="space-y-4 text-sm text-[#667781]">
              <div>
                <p className="font-semibold text-[#111b21]">How do I reset my password?</p>
                <p>
                  Go to the login screen and tap “Forgot password?” We’ll send a one-time code to your email.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111b21]">Why do I need to verify my email?</p>
                <p>
                  Email verification keeps your account secure and ensures you can recover access if needed.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111b21]">How do I invite friends?</p>
                <p>
                  Open Settings &gt; Invite a friend to create a shareable invite link.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#111b21]">Where can I see storage usage?</p>
                <p>
                  Open Settings &gt; Storage and data to view storage and network usage.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-10">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111b21] mb-2">Contact Us</h2>
            <p className="text-sm text-[#667781] mb-4">
              Tell us what you need help with and we’ll reply by email.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    status === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {feedback}
                </div>
              )}

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
                  placeholder="What can we help you with?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-[#f0f2f5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
                  placeholder="Describe your issue or question"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-[#1a8c7a] text-white py-3 rounded-xl font-medium hover:bg-[#1a8c7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Sending..." : "Send message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
