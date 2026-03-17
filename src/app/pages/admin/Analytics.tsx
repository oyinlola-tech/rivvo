import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { api } from "../../lib/api";

interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  messageStats: { date: string; count: number }[];
  callStats: { date: string; count: number }[];
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setError("");
    const response = await api.getAnalytics();
    if (response.success && response.data) {
      setAnalytics(response.data);
    } else if (!response.success) {
      setError(response.error || "Failed to load analytics");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Admin</p>
          <h1 className="text-2xl font-semibold">Analytics</h1>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#5f6d75]">User Growth</h3>
                  <TrendingUp className="text-[#1a8c7a]" size={22} />
                </div>
                <p className="text-3xl font-bold mb-2 text-[#111b21]">+12.5%</p>
                <p className="text-sm text-[#7a8a93]">vs last month</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#5f6d75]">Message Activity</h3>
                  <TrendingUp className="text-[#1a8c7a]" size={22} />
                </div>
                <p className="text-3xl font-bold mb-2 text-[#111b21]">+8.2%</p>
                <p className="text-sm text-[#7a8a93]">vs last month</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#5f6d75]">Call Activity</h3>
                  <TrendingDown className="text-[#1a8c7a]" size={22} />
                </div>
                <p className="text-3xl font-bold mb-2 text-[#111b21]">-3.1%</p>
                <p className="text-sm text-[#7a8a93]">vs last month</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#e6e6e6]">
              <h2 className="text-lg font-semibold mb-2">Activity Charts</h2>
              <p className="text-[#7a8a93]">Detailed charts coming soon...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


