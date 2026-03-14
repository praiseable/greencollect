/**
 * Idempotency Middleware
 * 
 * Prevents duplicate operations via Idempotency-Key header.
 * Skill requirement: Every POST that creates a resource must have idempotent middleware.
 * 
 * Uses Redis to cache responses for 24 hours.
 * If the same Idempotency-Key is used within 24 hours, returns cached response.
 */

const { getRedisClient } = require('../utils/redis');

/**
 * Idempotency middleware
 * Prevents duplicate operations by caching responses with Idempotency-Key
 * 
 * @param {number} ttlHours - Time to live in hours (default: 24)
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/orders', authenticate, idempotency(), async (req, res) => { ... });
 */
const idempotency = (ttlHours = 24) => {
  return async (req, res, next) => {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }
    
    const idempotencyKey = req.headers['idempotency-key'];
    
    // If no key provided, proceed normally
    if (!idempotencyKey) {
      return next();
    }
    
    // Get user ID for scoping (prevent cross-user key reuse)
    const userId = req.user?.id || 'anonymous';
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;
    
    try {
      const redis = await getRedisClient();
      
      if (redis) {
        // Check if we've seen this key before
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          // Return cached response
          const cachedResponse = JSON.parse(cached);
          return res.status(cachedResponse.statusCode).json(cachedResponse.body);
        }
      }
      
      // Store original res.json to cache response
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);
      let statusCode = 200;
      
      res.status = function(code) {
        statusCode = code;
        return originalStatus(code);
      };
      
      res.json = async function(data) {
        // Cache successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          try {
            const redis = await getRedisClient();
            if (redis) {
              await redis.set(
                cacheKey,
                JSON.stringify({ statusCode, body: data }),
                { EX: ttlHours * 60 * 60 } // TTL in seconds
              );
            }
          } catch (err) {
            console.error('Idempotency cache error:', err);
          }
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (err) {
      console.error('Idempotency middleware error:', err);
      // On error, proceed normally (fail open)
      next();
    }
  };
};

module.exports = { idempotency };
