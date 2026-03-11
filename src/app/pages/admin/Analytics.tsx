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

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const response = await api.getAnalytics();
    if (response.success && response.data) {
      setAnalytics(response.data);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20A090]"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-600">User Growth</h3>
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <p className="text-3xl font-bold mb-2">+12.5%</p>
              <p className="text-sm text-gray-500">vs last month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-600">Message Activity</h3>
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <p className="text-3xl font-bold mb-2">+8.2%</p>
              <p className="text-sm text-gray-500">vs last month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-600">Call Activity</h3>
                <TrendingDown className="text-red-500" size={24} />
              </div>
              <p className="text-3xl font-bold mb-2">-3.1%</p>
              <p className="text-sm text-gray-500">vs last month</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Activity Charts</h2>
            <p className="text-gray-500">Detailed charts coming soon...</p>
          </div>
        </>
      )}
    </div>
  );
}
