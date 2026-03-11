import { Outlet, Link, useLocation, Navigate } from "react-router";
import { MessageCircle, Phone, Users, Settings, CircleDot } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function MainLayout() {
  const location = useLocation();
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const navItems = [
    { path: "/", icon: MessageCircle, label: "Message" },
    { path: "/status", icon: CircleDot, label: "Status" },
    { path: "/calls", icon: Phone, label: "Calls" },
    { path: "/contacts", icon: Users, label: "Contacts" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#000e08] border-t border-border md:hidden">
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
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  <Icon
                    size={24}
                    className={isActive ? "text-[#20A090]" : "text-[#797C7B]"}
                  />
                  <span
                    className={`text-xs ${
                      isActive ? "text-[#20A090] font-medium" : "text-[#797C7B]"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop Side Navigation */}
        <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:w-64 md:bg-white dark:md:bg-[#000e08] md:border-r md:border-border md:flex-col md:p-6">
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
        </div>
      </div>
    </div>
  );
}
