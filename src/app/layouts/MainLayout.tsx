import { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router";
import { MessageCircle, Phone, Users, Settings, CircleDot, LayoutDashboard, MoreHorizontal } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function MainLayout() {
  const location = useLocation();
  const { user, loading, verificationPending } = useAuth();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a8c7a]"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
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

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
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

        {showMoreSheet && (
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
      </div>
    </div>
  );
}




