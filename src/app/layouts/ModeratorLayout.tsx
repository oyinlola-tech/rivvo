import { Outlet, Link, useLocation, Navigate } from "react-router";
import { ClipboardList, LogOut, ShieldAlert, Ban, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function ModeratorLayout() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();

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

  if (!user || !user.isModerator) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: "/moderator/reports", icon: ClipboardList, label: "Reports" },
    { path: "/moderator/audit-log", icon: ShieldAlert, label: "Audit Log" },
    { path: "/moderator/blocks", icon: Ban, label: "Blocked Users" },
    { path: "/moderator/search", icon: Search, label: "User Search" }
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex">
      <div className="w-64 bg-background border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold">RIVVO Moderator</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-[#1a8c7a] text-white" : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground w-full"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}



