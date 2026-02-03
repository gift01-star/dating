import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || null;
let redis = null;
let localCache = new Map();

if (REDIS_URL) {
  redis = new Redis(REDIS_URL);
  redis.on('error', (err) => console.error('Redis error', err));
  redis.on('ready', () => console.info('✓ Connected to Redis'));
}

async function get(key) {
  try {
    if (redis) {
      const v = await redis.get(key);
      return v;
    }
    const entry = localCache.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      localCache.delete(key);
      return null;
    }
    return entry.value;
  } catch (err) {
    console.error('Cache get error', err);
    return null;
  }
}

async function set(key, value, ttlSeconds = 60) {
  try {
    if (redis) {
      if (ttlSeconds) await redis.set(key, value, 'EX', ttlSeconds);
      else await redis.set(key, value);
      return true;
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    localCache.set(key, { value, expiry });
    return true;
  } catch (err) {
    console.error('Cache set error', err);
    return false;
  }
}

async function del(key) {
  try {
    if (redis) {
      await redis.del(key);
      return true;
    }
    localCache.delete(key);
    return true;
  } catch (err) {
    console.error('Cache del error', err);
    return false;
  }
}

export { redis, get, set, del };
