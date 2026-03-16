type CachePayload<T> = {
  cachedAt: number;
  data: T;
};

export const readCache = <T>(key: string, maxAgeMs: number): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload<T>;
    if (!parsed || typeof parsed.cachedAt !== "number") return null;
    if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const writeCache = <T>(key: string, data: T) => {
  try {
    const payload: CachePayload<T> = { cachedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};
