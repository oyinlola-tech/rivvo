import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router";
import { MessageCircle, Phone, Users, Settings, CircleDot, LayoutDashboard, MoreHorizontal, PhoneCall, PhoneOff, Video } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationsSheet from "../components/NotificationsSheet";
import { CallProvider, useCall } from "../contexts/CallContext";
import { getSocket } from "../lib/socket";
import { readCache, writeCache } from "../lib/cache";
import { saveMessages } from "../lib/messageStore";
import { ConversationDto } from "../lib/api";
import { recordConversationActivity } from "../lib/streak";

export default function MainLayout() {
  return (
    <CallProvider>
      <MainLayoutContent />
    </CallProvider>
  );
}

function MainLayoutContent() {
  const location = useLocation();
  const { user, loading, verificationPending } = useAuth();
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const { outgoingCall, incomingCall, acceptCall, declineCall, cancelCall, missedToast, outgoingSecondsLeft } = useCall();

  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    const cacheKey = `conversations:${user.id}`;

    const handleIncoming = (payload: {
      conversationId: string;
      message: { text: string; timestamp: string; senderId?: string; encrypted?: boolean; viewOnce?: boolean };
    }) => {
      if (payload.message.senderId && payload.message.senderId === user.id) {
        return;
      }
      const cached = readCache<ConversationDto[]>(cacheKey, Number.POSITIVE_INFINITY) || [];
      const updatedStreak = recordConversationActivity(user.id, payload.conversationId).count;
      const next = cached.map((conv) => {
        if (conv.id !== payload.conversationId) return conv;
        return {
          ...conv,
          streakCount: Math.max(conv.streakCount ?? 0, updatedStreak),
          lastMessage: {
            text: payload.message.viewOnce
              ? "View once message"
              : payload.message.encrypted
                ? "Message"
                : payload.message.text,
            timestamp: payload.message.timestamp,
            unreadCount: (conv.lastMessage?.unreadCount ?? 0) + 1,
          },
        };
      });
      if (next.length) {
        writeCache(cacheKey, next);
      }
      saveMessages(user.id, payload.conversationId, [payload.message]).catch(() => null);
    };

    socket.on("new_message", handleIncoming);
    return () => {
      socket.off("new_message", handleIncoming);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center">
          <img src="/rivvo.png" alt="Rivvo logo" className="mx-auto w-16 h-16 rounded-2xl shadow-lg" />
          <p className="mt-4 text-lg font-bold tracking-[0.3em] text-foreground">RIVVO</p>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const navItems = [
    { path: "/", icon: MessageCircle, label: "Message" },
    { path: "/status", icon: CircleDot, label: "Status" },
    { path: "/calls", icon: Phone, label: "Calls" },
    { path: "/settings", icon: Settings, label: "Settings", badge: verificationPending ? "Pending" : null },
  ];
  const moreItems = [
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/groups", icon: Users, label: "Groups" },
  ];
  if (user.isAdmin) {
    navItems.push({ path: "/admin", icon: LayoutDashboard, label: "Admin" });
  }

  const hideGlobalNav =
    location.pathname.startsWith("/messages/") ||
    location.pathname.startsWith("/call/");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-7xl mx-auto">
        <div className={hideGlobalNav ? "" : "pb-20 md:pb-0"}>
          <Outlet />
        </div>
        <NotificationsSheet />

        {/* Mobile Bottom Navigation */}
        {!hideGlobalNav && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden">
          <div className="flex justify-around items-center h-20 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-colors ${
                    isActive ? "text-[#1a8c7a]" : "text-[#667781]"
                  }`}
                >
                  <Icon
                    size={24}
                    className={isActive ? "text-[#1a8c7a]" : "text-[#667781]"}
                  />
                  <span
                    className={`text-xs ${
                      isActive ? "text-[#1a8c7a] font-medium" : "text-[#667781]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => setShowMoreSheet(true)}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl text-[#667781]"
              aria-label="More"
            >
              <MoreHorizontal size={24} />
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>
        )}

        {showMoreSheet && !hideGlobalNav && (
          <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
            <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#111b21]">More</h2>
                <button
                  onClick={() => setShowMoreSheet(false)}
                  className="text-sm text-[#667781]"
                >
                  Close
                </button>
              </div>
              <div className="space-y-2">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMoreSheet(false)}
                      className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-[#f7f9f9]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#e9edef] flex items-center justify-center">
                        <Icon size={18} className="text-[#54656f]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#111b21]">{item.label}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Side Navigation */}
        {!hideGlobalNav && (
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:w-64 md:bg-background md:border-r md:border-border md:flex-col md:p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">RIVVO</h1>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#1a8c7a] text-white"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        )}
      </div>
      {(outgoingCall || incomingCall) && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-white text-center space-y-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-3xl font-semibold">
              {(incomingCall?.fromUser.avatar || outgoingCall?.toUser.avatar) ? (
                <img
                  src={incomingCall?.fromUser.avatar || outgoingCall?.toUser.avatar}
                  alt={incomingCall?.fromUser.name || outgoingCall?.toUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (incomingCall?.fromUser.name || outgoingCall?.toUser.name || "U")[0]
              )}
            </div>
            <div>
              <p className="text-xl font-semibold">
                {incomingCall?.fromUser.name || outgoingCall?.toUser.name}
              </p>
              <p className="text-sm text-white/70 mt-1">
                {incomingCall
                  ? `${incomingCall.type === "video" ? "Video" : "Voice"} call`
                  : outgoingCall?.status === "ringing"
                    ? "Ringing..."
                    : "Calling..."}
              </p>
              {outgoingCall && outgoingSecondsLeft !== null && (
                <p className="text-xs text-white/60 mt-1">{outgoingSecondsLeft}s</p>
              )}
            </div>
            {incomingCall ? (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={declineCall}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center"
                  aria-label="Decline"
                >
                  <PhoneOff size={24} />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center"
                  aria-label="Accept"
                >
                  {incomingCall.type === "video" ? <Video size={24} /> : <PhoneCall size={24} />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={cancelCall}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center"
                  aria-label="Cancel call"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {missedToast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-black/80 text-white px-4 py-2 text-sm shadow-lg">
          {missedToast.text}
        </div>
      )}
    </div>
  );
}




