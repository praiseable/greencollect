/**
 * Trust Headers Middleware
 * 
 * For microservices: Trust X-User-* headers set by gateway.
 * Also supports direct JWT validation for /validate endpoint.
 */

const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'internal-service-secret-change-in-production';

/**
 * Trust X-User-* headers (set by gateway)
 * Also validates internal service secret to prevent header forgery
 */
function trustHeaders(req, res, next) {
  // Check internal service secret (prevents header forgery)
  const secret = req.headers['x-internal-service-secret'];
  if (secret !== INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({
      error: { message: 'Invalid service secret', code: 'FORBIDDEN' }
    });
  }
  
  // Extract user info from headers
  const userId = req.headers['x-user-id'];
  const portal = req.headers['x-user-portal'];
  const roles = req.headers['x-user-roles'] ? JSON.parse(req.headers['x-user-roles']) : [];
  const email = req.headers['x-user-email'];
  
  if (!userId) {
    return res.status(401).json({
      error: { message: 'User information missing', code: 'AUTH_REQUIRED' }
    });
  }
  
  // Attach user info to request
  req.user = {
    id: userId,
    portal: portal,
    roles: roles,
    email: email,
  };
  
  next();
}

/**
 * Validate JWT directly (for /validate endpoint used by gateway)
 */
async function validateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'No token provided', code: 'AUTH_REQUIRED' } });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Invalid token format', code: 'AUTH_INVALID' } });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: { message: 'User not found or inactive', code: 'AUTH_INVALID' } });
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      portal: decoded.portal || null,
      roles: decoded.roles || [decoded.role || user.role],
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.setHeader('X-Token-Error', 'tokenExpired');
      return res.status(401).json({ error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } });
    }
    res.setHeader('X-Token-Error', 'tokenInvalid');
    return res.status(401).json({ error: { message: 'Invalid token', code: 'AUTH_INVALID' } });
  }
}

module.exports = { trustHeaders, validateJWT };
