// In-memory cache for balance computations.
// In a full production environment, this would be backed by Redis (ioredis).

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Cache expiration in milliseconds (e.g., 5 minutes)
const TTL = 5 * 60 * 1000;

export const Cache = {
  get: <T>(key: string): T | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > TTL) {
      memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  },

  set: <T>(key: string, data: T): void => {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  delete: (key: string): void => {
    memoryCache.delete(key);
  },

  // Invalidates all keys that start with a certain prefix
  invalidatePrefix: (prefix: string): void => {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  },
};
