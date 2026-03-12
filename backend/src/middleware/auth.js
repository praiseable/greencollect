const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'AUTH_REQUIRED' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    req.user = user;
    req.lang = req.headers['accept-language']?.split(',')[0]?.trim() || user.languageId || 'en';
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } });
    }
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
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
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
      if (user && user.isActive !== false) req.user = user;
    }
  } catch (e) { /* ignore */ }
  req.lang = req.headers['accept-language']?.split(',')[0]?.trim() || req.user?.languageId || 'en';
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
