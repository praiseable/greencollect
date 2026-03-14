/**
 * Cookie Helper Utilities
 * 
 * Helper functions for setting HttpOnly cookies for refresh tokens.
 * Skill requirement: refresh tokens must be in HttpOnly cookies (not localStorage).
 * 
 * Note: Mobile apps cannot use cookies, so they continue using request body (acceptable).
 */

/**
 * Set refresh token as HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - Refresh token JWT
 * @param {number} maxAgeDays - Cookie max age in days (default: 7)
 */
function setRefreshTokenCookie(res, refreshToken, maxAgeDays = 7) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, // Prevents XSS attacks (skill requirement)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/', // Available for all paths
  });
}

/**
 * Clear refresh token cookie
 * @param {Object} res - Express response object
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Get refresh token from cookie or request body (backward compatibility for mobile)
 * @param {Object} req - Express request object
 * @returns {string|null} Refresh token or null
 */
function getRefreshTokenFromRequest(req) {
  // Try cookie first (web clients)
  if (req.cookies?.refresh_token) {
    return req.cookies.refresh_token;
  }
  
  // Fallback to request body (mobile apps)
  if (req.body?.refreshToken) {
    return req.body.refreshToken;
  }
  
  return null;
}

module.exports = {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
};
