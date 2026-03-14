/**
 * Redis Client Utility
 * 
 * Shared Redis client for token family tracking, login throttle, etc.
 * Falls back gracefully if Redis is not available.
 */

const { createClient } = require('redis');

let redisClient = null;
let isConnecting = false;

/**
 * Get or create Redis client (lazy initialization)
 * @returns {Promise<RedisClient|null>} Redis client or null if unavailable
 */
async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (redisClient && redisClient.isOpen) {
          clearInterval(checkInterval);
          resolve(redisClient);
        } else if (!isConnecting) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    });
  }

  if (!process.env.REDIS_URL) {
    return null;
  }

  isConnecting = true;

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      redisClient = null;
    });

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    isConnecting = false;
    return redisClient;
  } catch (err) {
    console.warn('Redis not available, using fallback:', err.message);
    redisClient = null;
    isConnecting = false;
    return null;
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedisClient, closeRedis };
