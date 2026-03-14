/**
 * Refresh Token Storage Utility
 * 
 * Stores refresh tokens in Redis (skill requirement).
 * Falls back to PostgreSQL if Redis is unavailable (backward compatibility).
 * 
 * Redis key pattern: refresh:{portal}:{userId}
 * TTL: 7 days (604800 seconds)
 */

const { getRedisClient } = require('./redis');
const prisma = require('../services/prisma');

/**
 * Store refresh token in Redis (primary) or PostgreSQL (fallback)
 * @param {string} userId - User ID
 * @param {string} portal - Portal identifier
 * @param {string} refreshToken - Refresh token JWT
 * @param {Date} expiresAt - Expiry date
 */
async function storeRefreshToken(userId, portal, refreshToken, expiresAt) {
  const redis = await getRedisClient();
  
  if (redis) {
    // Store in Redis (skill requirement)
    const key = `refresh:${portal}:${userId}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await redis.set(key, refreshToken, { EX: ttlSeconds });
  } else {
    // Fallback to PostgreSQL (backward compatibility)
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
  }
}

/**
 * Get refresh token from Redis (primary) or PostgreSQL (fallback)
 * @param {string} userId - User ID
 * @param {string} portal - Portal identifier
 * @param {string} refreshToken - Refresh token to verify
 * @returns {Promise<boolean>} True if token exists and is valid
 */
async function getRefreshToken(userId, portal, refreshToken) {
  const redis = await getRedisClient();
  
  if (redis) {
    // Check Redis first
    const key = `refresh:${portal}:${userId}`;
    const stored = await redis.get(key);
    return stored === refreshToken;
  } else {
    // Fallback to PostgreSQL
    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
    });
    return !!stored;
  }
}

/**
 * Delete refresh token from Redis (primary) or PostgreSQL (fallback)
 * @param {string} userId - User ID
 * @param {string} portal - Portal identifier (optional, for Redis)
 * @param {string} refreshToken - Specific token to delete (optional)
 */
async function deleteRefreshToken(userId, portal = null, refreshToken = null) {
  const redis = await getRedisClient();
  
  if (redis && portal) {
    // Delete from Redis
    const key = `refresh:${portal}:${userId}`;
    await redis.del(key);
  }
  
  // Also delete from PostgreSQL (for cleanup and fallback)
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  } else {
    // Delete all tokens for user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}

/**
 * Delete all refresh tokens for a user (logout)
 * @param {string} userId - User ID
 * @param {string} portal - Portal identifier (optional)
 */
async function deleteAllRefreshTokens(userId, portal = null) {
  const redis = await getRedisClient();
  
  if (redis && portal) {
    // Delete from Redis
    const key = `refresh:${portal}:${userId}`;
    await redis.del(key);
  }
  
  // Delete all from PostgreSQL
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

module.exports = {
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
};
