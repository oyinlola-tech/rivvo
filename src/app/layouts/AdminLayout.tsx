import { Outlet, Link, useLocation, Navigate } from "react-router";
import { LayoutDashboard, Users, Flag, BarChart3, Shield, LogOut, MessageCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#20A090]"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/users", icon: Users, label: "Users" },
    { path: "/admin/reports", icon: Flag, label: "Reports" },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/admin/moderators", icon: Shield, label: "Moderators" },
    { path: "/admin/verification-payments", icon: CheckCircle, label: "Verification" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-[#000e08] border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold">RIVVO Admin</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/admin" 
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path) && item.path !== "/admin";
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#20A090] text-white"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground w-full mb-2"
          >
            <MessageCircle size={20} />
            <span>User App</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground w-full"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
