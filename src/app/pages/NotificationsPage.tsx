import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Dot, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { MobileNav } from '../components/MobileNav';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { notificationsApi, type NotificationItem, type NotificationPreferences } from '../api/notifications';

const fallbackNotifications: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'New message from Amina',
    body: 'Can you review the design draft today?',
    type: 'message',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isRead: false,
  },
  {
    id: 'n-2',
    title: 'Missed voice call',
    body: 'You missed a call from Marcus.',
    type: 'call',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'n-3',
    title: 'Status update',
    body: 'Lydia posted a new status.',
    type: 'status',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
  },
];

const fallbackPreferences: NotificationPreferences = {
  pushEnabled: false,
  messages: true,
  calls: true,
  status: true,
  system: true,
  marketing: false,
  quietHours: {
    start: '22:00',
    end: '07:00',
    timezone: 'Africa/Lagos',
  },
};

const typeLabels: Record<NotificationItem['type'], string> = {
  message: 'Message',
  call: 'Call',
  status: 'Status',
  system: 'System',
  marketing: 'Promo',
};

const typeBadgeVariant: Record<NotificationItem['type'], 'default' | 'secondary' | 'outline'> = {
  message: 'default',
  call: 'secondary',
  status: 'outline',
  system: 'secondary',
  marketing: 'outline',
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [notificationsData, preferencesData] = await Promise.all([
          notificationsApi.getNotifications(),
          notificationsApi.getPreferences(),
        ]);
        if (!mounted) return;
        setNotifications(notificationsData);
        setPreferences(preferencesData);
      } catch (error) {
        if (!mounted) return;
        setNotifications(fallbackNotifications);
        setPreferences(fallbackPreferences);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    } catch (error) {
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setUpdatingPrefs(true);
    const optimistic = { ...preferences, [key]: value };
    setPreferences(optimistic);
    try {
      const updated = await notificationsApi.updatePreferences({ [key]: value });
      setPreferences(updated);
      toast.success('Notification preferences updated');
    } catch (error) {
      setPreferences(preferences);
      toast.error('Could not update preferences');
    } finally {
      setUpdatingPrefs(false);
    }
  };

  const handleTogglePush = async () => {
    if (!preferences) return;
    const nextValue = !preferences.pushEnabled;
    await handleTogglePreference('pushEnabled', nextValue);
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
    } catch (error) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            variant="outline"
            className="hidden md:inline-flex"
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="p-4 md:p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-foreground">Enable push alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Syncs with your device for real-time delivery.
                  </p>
                </div>
                <Switch
                  checked={Boolean(preferences?.pushEnabled)}
                  onCheckedChange={handleTogglePush}
                  disabled={updatingPrefs}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Smartphone className="w-4 h-4" />
                <span>Device registration uses the Notifications API and your push token.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['messages', 'calls', 'status', 'system', 'marketing'] as const).map((key) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-foreground capitalize">{key}</p>
                    <p className="text-xs text-muted-foreground">
                      {key === 'messages' && 'New chats and group messages.'}
                      {key === 'calls' && 'Incoming calls and call reminders.'}
                      {key === 'status' && 'Friend status updates.'}
                      {key === 'system' && 'Security and account alerts.'}
                      {key === 'marketing' && 'Product tips and announcements.'}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(preferences?.[key])}
                    onCheckedChange={(value) => handleTogglePreference(key, value)}
                    disabled={updatingPrefs || !preferences}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between md:hidden">
            <Button variant="outline" onClick={handleMarkAllRead} disabled={notifications.length === 0}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && (
                <div className="text-sm text-muted-foreground">Loading notifications...</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="text-sm text-muted-foreground">You're all caught up.</div>
              )}
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3 rounded-lg border px-3 py-3 transition-colors ${
                    item.isRead ? 'bg-muted/30 border-border' : 'bg-primary/5 border-primary/30'
                  }`}
                >
                  <div className="mt-1">
                    {item.isRead ? (
                      <Check className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Dot className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-foreground">{item.title}</p>
                      <Badge variant={typeBadgeVariant[item.type]}>{typeLabels[item.type]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!item.isRead && (
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleMarkRead(item.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
