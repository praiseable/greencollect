const expressRateLimit = require('express-rate-limit');
const { createClient } = require('redis');

const rateLimit = expressRateLimit.rateLimit || expressRateLimit;
const ipKeyGenerator = expressRateLimit.ipKeyGenerator || ((ip) => ip || 'unknown');

let redisClient = null;
const memoryStore = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_SECONDS = Math.floor(WINDOW_MS / 1000);

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error (login throttle):', err);
      redisClient = null;
    });

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    return redisClient;
  } catch (err) {
    console.warn('Redis not available for login throttle, using memory store:', err.message);
    redisClient = null;
    return null;
  }
}

function memoryIncrement(key) {
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
  }

  entry.count += 1;
  memoryStore.set(key, entry);

  return {
    totalHits: entry.count,
    resetTime: new Date(entry.resetTime),
  };
}

/**
 * express-rate-limit v7/v8-compatible store.
 * The old implementation used the pre-v7 `incr(key, cb)` store contract, which
 * produces invalid RateLimit headers and can break portal login routes under
 * express-rate-limit 8.x. Keep Redis as the distributed store and fall back to
 * in-process memory if Redis is unavailable.
 */
const loginThrottleStore = {
  async increment(key) {
    try {
      const client = await getRedisClient();
      if (!client) return memoryIncrement(key);

      const totalHits = await client.incr(key);
      if (totalHits === 1) {
        await client.expire(key, WINDOW_SECONDS);
      }

      let ttl = await client.ttl(key);
      if (!ttl || ttl < 0) ttl = WINDOW_SECONDS;

      return {
        totalHits,
        resetTime: new Date(Date.now() + ttl * 1000),
      };
    } catch (err) {
      console.error('Login throttle store error:', err);
      return memoryIncrement(key);
    }
  },

  async decrement(key) {
    try {
      const client = await getRedisClient();
      if (client) {
        await client.decr(key);
        return;
      }

      const entry = memoryStore.get(key);
      if (entry && entry.count > 0) entry.count -= 1;
    } catch (err) {
      console.error('Login throttle decrement error:', err);
    }
  },

  async resetKey(key) {
    try {
      const client = await getRedisClient();
      if (client) {
        await client.del(key);
        return;
      }
      memoryStore.delete(key);
    } catch (err) {
      console.error('Login throttle reset error:', err);
    }
  },
};

const loginThrottle = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  message: {
    error: {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'LOGIN_THROTTLED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.phone;
    if (identifier) return `login_throttle:${String(identifier).toLowerCase()}`;
    return `login_throttle:${ipKeyGenerator(req.ip, 56)}`;
  },
  store: loginThrottleStore,
});

async function resetLoginThrottle(identifier) {
  try {
    if (!identifier) return;
    const key = `login_throttle:${String(identifier).toLowerCase()}`;
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
    } else {
      memoryStore.delete(key);
    }
  } catch (err) {
    console.error('Failed to reset login throttle:', err);
  }
}

module.exports = { loginThrottle, resetLoginThrottle };
