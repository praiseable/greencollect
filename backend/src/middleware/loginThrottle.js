const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');

// Redis client for rate limiting (shared with other Redis usage)
let redisClient = null;

// Initialize Redis client (lazy initialization)
async function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis Client Error (login throttle):', err);
        redisClient = null; // Fallback to memory store
      });
      
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (err) {
      console.warn('Redis not available for login throttle, using memory store:', err.message);
      redisClient = null;
    }
  }
  return redisClient;
}

/**
 * Login Throttle Middleware
 * 
 * Prevents brute-force attacks by limiting login attempts:
 * - 5 attempts per 15-minute window per email/phone
 * - Uses Redis for distributed rate limiting (falls back to memory)
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/admin/login', loginThrottle, [...], async (req, res) => { ... });
 */
const loginThrottle = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'LOGIN_THROTTLED'
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Key by email or phone (whichever is provided)
  keyGenerator: (req) => {
    const identifier = req.body.email || req.body.phone || req.ip;
    return `login_throttle:${identifier}`;
  },
  // Custom store: try Redis, fallback to memory
  store: {
    async incr(key, cb) {
      try {
        const client = await getRedisClient();
        if (client) {
          // Use Redis
          const count = await client.incr(key);
          if (count === 1) {
            // Set expiry on first increment
            await client.expire(key, 15 * 60); // 15 minutes
          }
          cb(null, { current: count, resetTime: new Date(Date.now() + 15 * 60 * 1000) });
        } else {
          // Fallback to memory (in-process only)
          if (!this.memoryStore) this.memoryStore = new Map();
          const entry = this.memoryStore.get(key) || { count: 0, resetTime: Date.now() + 15 * 60 * 1000 };
          
          if (Date.now() > entry.resetTime) {
            // Reset expired entry
            entry.count = 0;
            entry.resetTime = Date.now() + 15 * 60 * 1000;
          }
          
          entry.count++;
          this.memoryStore.set(key, entry);
          cb(null, { current: entry.count, resetTime: new Date(entry.resetTime) });
        }
      } catch (err) {
        console.error('Login throttle store error:', err);
        // On error, allow request (fail open)
        cb(null, { current: 0, resetTime: new Date() });
      }
    },
    async decrement(key) {
      try {
        const client = await getRedisClient();
        if (client) {
          await client.decr(key);
        } else if (this.memoryStore && this.memoryStore.has(key)) {
          const entry = this.memoryStore.get(key);
          if (entry.count > 0) entry.count--;
        }
      } catch (err) {
        console.error('Login throttle decrement error:', err);
      }
    },
    async resetKey(key) {
      try {
        const client = await getRedisClient();
        if (client) {
          await client.del(key);
        } else if (this.memoryStore) {
          this.memoryStore.delete(key);
        }
      } catch (err) {
        console.error('Login throttle reset error:', err);
      }
    }
  },
  // Skip successful logins (reset counter on success)
  skip: (req, res) => {
    // This will be handled in the login route after successful authentication
    return false;
  }
});

/**
 * Reset login throttle for a successful login
 * Call this after successful authentication to clear the throttle counter
 * 
 * @param {string} identifier - Email or phone that was used for login
 */
async function resetLoginThrottle(identifier) {
  try {
    const key = `login_throttle:${identifier}`;
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
    }
  } catch (err) {
    console.error('Failed to reset login throttle:', err);
  }
}

module.exports = { loginThrottle, resetLoginThrottle };
