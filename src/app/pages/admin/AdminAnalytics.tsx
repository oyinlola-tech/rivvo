import { useState, useEffect } from 'react';
import { Users, MessageCircle, Phone, Users as GroupIcon } from 'lucide-react';
import { adminApi, AdminStats } from '../../api/admin';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await adminApi.getStats();
      setStats(statsData);
    } catch (error: any) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: Users, color: 'text-green-500' },
    { label: 'Total Messages', value: stats?.totalMessages || 0, icon: MessageCircle, color: 'text-purple-500' },
    { label: 'Total Groups', value: stats?.totalGroups || 0, icon: GroupIcon, color: 'text-orange-500' },
    { label: 'Total Calls', value: stats?.totalCalls || 0, icon: Phone, color: 'text-pink-500' },
    { label: 'New Users Today', value: stats?.newUsersToday || 0, icon: Users, color: 'text-cyan-500' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <h2 className="text-2xl text-foreground mb-2">Analytics Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of platform activity and statistics</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, idx) => (
            <div key={idx} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-3xl text-foreground">{stat.value.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg text-foreground mb-4">Messages Per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.messagesPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--rivvo-blue)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Users Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg text-foreground mb-4">New Users Per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.usersPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="var(--rivvo-blue)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg text-foreground mb-4">Platform Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">User Engagement</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${stats ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-foreground">
                  {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Avg. Messages/User</p>
              <p className="text-2xl text-foreground">
                {stats ? Math.round(stats.totalMessages / stats.totalUsers) : 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Avg. Group Size</p>
              <p className="text-2xl text-foreground">
                {stats && stats.totalGroups > 0 ? Math.round(stats.totalUsers / stats.totalGroups) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
