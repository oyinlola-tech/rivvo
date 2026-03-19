import { v4 as uuid } from 'uuid';

const preferencesStore = new Map();
const notificationsStore = new Map();
const devicesStore = new Map();

const defaultPreferences = {
  pushEnabled: false,
  messages: true,
  calls: true,
  status: true,
  system: true,
  marketing: false,
  quietHours: {
    start: '22:00',
    end: '07:00',
    timezone: 'Africa/Lagos'
  }
};

const getUserPrefs = (userId) => {
  const existing = preferencesStore.get(userId);
  return existing ? { ...defaultPreferences, ...existing } : { ...defaultPreferences };
};

const getUserNotifications = (userId) => {
  const items = notificationsStore.get(userId);
  return Array.isArray(items) ? items.slice() : [];
};

export const getNotifications = async (req, res) => {
  const userId = req.user?.id;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const unreadOnly = req.query.unreadOnly === 'true';

  const items = getUserNotifications(userId)
    .filter((item) => (unreadOnly ? !item.isRead : true))
    .slice(offset, offset + limit);

  return res.json(items);
};

export const markAsRead = async (req, res) => {
  const userId = req.user?.id;
  const { notificationId } = req.params;
  const items = getUserNotifications(userId);
  const updated = items.map((item) =>
    item.id === notificationId
      ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
      : item
  );
  notificationsStore.set(userId, updated);
  return res.json({ message: 'Notification marked as read' });
};

export const markAllAsRead = async (req, res) => {
  const userId = req.user?.id;
  const items = getUserNotifications(userId).map((item) => ({
    ...item,
    isRead: true,
    readAt: item.readAt || new Date().toISOString()
  }));
  notificationsStore.set(userId, items);
  return res.json({ message: 'All notifications marked as read' });
};

export const deleteNotification = async (req, res) => {
  const userId = req.user?.id;
  const { notificationId } = req.params;
  const items = getUserNotifications(userId).filter((item) => item.id !== notificationId);
  notificationsStore.set(userId, items);
  return res.json({ message: 'Notification deleted' });
};

export const getPreferences = async (req, res) => {
  const userId = req.user?.id;
  return res.json(getUserPrefs(userId));
};

export const updatePreferences = async (req, res) => {
  const userId = req.user?.id;
  const existing = getUserPrefs(userId);
  const next = { ...existing, ...req.body };
  preferencesStore.set(userId, next);
  return res.json(next);
};

export const registerDevice = async (req, res) => {
  const userId = req.user?.id;
  const { token, platform, deviceId } = req.body || {};
  if (!token || !platform) {
    return res.status(400).json({ message: 'token and platform required' });
  }

  const id = deviceId || uuid();
  const list = devicesStore.get(userId) || [];
  const existing = list.find((device) => device.deviceId === id);
  if (!existing) {
    list.push({ deviceId: id, token, platform });
    devicesStore.set(userId, list);
  }

  return res.status(201).json({ deviceId: id, token, platform });
};

export const unregisterDevice = async (req, res) => {
  const userId = req.user?.id;
  const { deviceId } = req.params;
  const list = devicesStore.get(userId) || [];
  devicesStore.set(
    userId,
    list.filter((device) => device.deviceId !== deviceId)
  );
  return res.json({ message: 'Device unregistered' });
};
