import { useState, useEffect } from "react";
import { Users, MessageCircle, Phone, TrendingUp } from "lucide-react";
import { api } from "../../lib/api";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalCalls: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    totalCalls: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setError("");
    const response = await api.getAnalytics();
    if (response.success && response.data) {
      setStats(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load dashboard stats");
    }
    setLoading(false);
  };

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Active Users",
      value: stats.activeUsers,
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      label: "Total Messages",
      value: stats.totalMessages,
      icon: MessageCircle,
      color: "bg-purple-500",
    },
    {
      label: "Total Calls",
      value: stats.totalCalls,
      icon: Phone,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Admin</p>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-[#1a8c7a] rounded-xl flex items-center justify-center">
                        <Icon className="text-white" size={22} />
                      </div>
                    </div>
                    <h3 className="text-[#7a8a93] text-sm font-medium mb-1">{stat.label}</h3>
                    <p className="text-3xl font-bold text-[#111b21]">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]">
              <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
              <p className="text-[#7a8a93]">Activity chart coming soon...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


