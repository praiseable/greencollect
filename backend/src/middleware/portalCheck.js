const { Portal } = require('../../../packages/shared/src/constants');

/**
 * Portal Check Middleware
 * 
 * Validates that the request token's portal matches the expected portal for the route.
 * Prevents cross-portal access (e.g., customer token accessing admin routes).
 * 
 * @param {string} expectedPortal - Expected portal from Portal enum
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/dashboard', authenticate, portalCheck(Portal.ADMIN), getDashboard);
 */
const portalCheck = (expectedPortal) => {
  return (req, res, next) => {
    // Ensure authenticate middleware ran first
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    const tokenPortal = req.user.portal;

    // If no portal in token, try to derive from role (backward compatibility)
    if (!tokenPortal && req.user.role) {
      const { ROLE_TO_PORTAL } = require('../../../packages/shared/src/constants');
      const derivedPortal = ROLE_TO_PORTAL[req.user.role];
      if (derivedPortal) {
        req.user.portal = derivedPortal;
      }
    }

    const actualPortal = req.user.portal || null;

    // Portal mismatch - reject request
    if (!actualPortal || actualPortal !== expectedPortal) {
      return res.status(403).json({
        error: {
          message: `Access denied: ${expectedPortal} portal required. Your token is for ${actualPortal || 'unknown'} portal.`,
          code: 'PORTAL_FORBIDDEN',
          expectedPortal,
          actualPortal
        }
      });
    }

    // Portal matches - proceed
    next();
  };
};

module.exports = { portalCheck };
