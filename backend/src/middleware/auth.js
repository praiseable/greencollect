const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Portal } = require('../../../packages/shared/src/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';

// Verify JWT token (skill-compliant: supports both old and new payload format)
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'AUTH_REQUIRED' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Support both old format (userId) and new format (sub) for backward compatibility
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Invalid token format', code: 'AUTH_INVALID' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        isActive: true,
        languageId: true,
        currencyId: true,
        countryId: true,
        geoZoneId: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: { message: 'User not found or inactive', code: 'AUTH_INVALID' } });
    }

    // Attach portal and roles from token (if present) for portal checking
    req.user = user;
    req.user.portal = decoded.portal || null; // Portal from token
    req.user.roles = decoded.roles || [decoded.role || user.role]; // Roles array from token
    req.lang = req.headers['accept-language']?.split(',')[0]?.trim() || user.languageId || 'en';
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.setHeader('X-Token-Error', 'tokenExpired'); // Skill-compliant header
      res.setHeader('X-Token-Expired', 'true'); // Backward compatibility
      return res.status(401).json({ error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } });
    }
    res.setHeader('X-Token-Error', 'tokenInvalid'); // Skill-compliant header
    return res.status(401).json({ error: { message: 'Invalid token', code: 'AUTH_INVALID' } });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token (used by GET /listings so dealers see territory listings)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.sub || decoded.userId;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            geoZoneId: true,
            isActive: true,
            languageId: true,
            currencyId: true,
            countryId: true,
          },
        });
        if (user && user.isActive !== false) {
          req.user = user;
          req.user.portal = decoded.portal || null;
          req.user.roles = decoded.roles || [decoded.role || user.role];
        }
      }
    }
  } catch (e) { /* ignore */ }
  req.lang = req.headers['accept-language']?.split(',')[0]?.trim() || req.user?.languageId || 'en';
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
