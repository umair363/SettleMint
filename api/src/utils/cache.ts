import Redis from 'ioredis';

// Connect to Redis. Defaults to localhost if not specified in env.
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Prevent unhandled errors from crashing the server
redis.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
});

// Cache expiration in seconds (5 minutes)
const TTL_SECONDS = 5 * 60;

export const Cache = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.error('Redis GET Error:', err);
      return null;
    }
  },

  set: async <T>(key: string, data: T): Promise<void> => {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', TTL_SECONDS);
    } catch (err) {
      console.error('Redis SET Error:', err);
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      await redis.del(key);
    } catch (err) {
      console.error('Redis DEL Error:', err);
    }
  },

  // Note: KEYS is generally not recommended in production for large datasets,
  // but for prefix invalidation at this scale it suffices.
  invalidatePrefix: async (prefix: string): Promise<void> => {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error('Redis Invalidate Prefix Error:', err);
    }
  },
};
