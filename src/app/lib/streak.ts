const buildDayKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getYesterdayKey = (date: Date = new Date()) => {
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate() - 1);
  return buildDayKey(yesterday);
};

const storageKey = (userId: string) => `rivvo:msgStreak:${userId}`;
const conversationKey = (userId: string, conversationId: string) =>
  `rivvo:msgStreak:${userId}:${conversationId}`;

export const getMessagingStreak = (userId: string) => {
  if (!userId) return { count: 0, lastDate: null as string | null };
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return { count: 0, lastDate: null as string | null };
  try {
    const parsed = JSON.parse(raw) as { count: number; lastDate: string };
    return { count: parsed.count || 0, lastDate: parsed.lastDate || null };
  } catch {
    return { count: 0, lastDate: null as string | null };
  }
};

export const recordMessageSent = (userId: string, at: Date = new Date()) => {
  if (!userId) return { count: 0, lastDate: null as string | null };
  const todayKey = buildDayKey(at);
  const yesterdayKey = getYesterdayKey(at);
  const current = getMessagingStreak(userId);

  if (!current.lastDate) {
    const next = { count: 1, lastDate: todayKey };
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  }

  if (current.lastDate === todayKey) {
    return current;
  }

  const nextCount = current.lastDate === yesterdayKey ? current.count + 1 : 1;
  const next = { count: nextCount, lastDate: todayKey };
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
};

export const getConversationStreak = (userId: string, conversationId: string) => {
  if (!userId || !conversationId) return { count: 0, lastDate: null as string | null };
  const raw = localStorage.getItem(conversationKey(userId, conversationId));
  if (!raw) return { count: 0, lastDate: null as string | null };
  try {
    const parsed = JSON.parse(raw) as { count: number; lastDate: string };
    return { count: parsed.count || 0, lastDate: parsed.lastDate || null };
  } catch {
    return { count: 0, lastDate: null as string | null };
  }
};

export const recordConversationActivity = (
  userId: string,
  conversationId: string,
  at: Date = new Date()
) => {
  if (!userId || !conversationId) return { count: 0, lastDate: null as string | null };
  const todayKey = buildDayKey(at);
  const yesterdayKey = getYesterdayKey(at);
  const current = getConversationStreak(userId, conversationId);

  if (!current.lastDate) {
    const next = { count: 1, lastDate: todayKey };
    localStorage.setItem(conversationKey(userId, conversationId), JSON.stringify(next));
    return next;
  }

  if (current.lastDate === todayKey) {
    return current;
  }

  const nextCount = current.lastDate === yesterdayKey ? current.count + 1 : 1;
  const next = { count: nextCount, lastDate: todayKey };
  localStorage.setItem(conversationKey(userId, conversationId), JSON.stringify(next));
  return next;
};
