/**
 * API Gateway
 * 
 * Routes requests to microservices.
 * Validates JWTs and sets X-User-* headers.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const proxy = require('express-http-proxy');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5000';
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:5001';
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:5002';

const JWT_SECRET = process.env.JWT_SECRET || 'gc_jwt_prod_s3cr3t_k3y_2026_x7m9q';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'internal-service-secret-change-in-production';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Validate JWT and extract user info
 */
async function validateToken(token) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Extract user info
    const userId = decoded.sub || decoded.userId;
    const portal = decoded.portal;
    const roles = decoded.roles || [decoded.role];
    const email = decoded.email;
    
    return {
      valid: true,
      userId,
      portal,
      roles,
      email,
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Gateway middleware - validates JWT and sets X-User-* headers
 */
async function gatewayAuth(req, res, next) {
  // Skip auth for public endpoints
  const publicPaths = ['/health', '/auth/login', '/auth/register', '/auth/otp'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: { message: 'No token provided', code: 'AUTH_REQUIRED' } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Validate token
  const validation = await validateToken(token);
  if (!validation.valid) {
    return res.status(401).json({ 
      error: { message: 'Invalid token', code: 'TOKEN_INVALID' } 
    });
  }
  
  // Set X-User-* headers (services trust these headers)
  req.headers['x-user-id'] = validation.userId;
  req.headers['x-user-portal'] = validation.portal;
  req.headers['x-user-roles'] = JSON.stringify(validation.roles);
  req.headers['x-user-email'] = validation.email || '';
  req.headers['x-internal-service-secret'] = INTERNAL_SERVICE_SECRET;
  
  // Remove Authorization header (services use X-User-* headers)
  delete req.headers.authorization;
  
  // Attach user info to request for portal checking
  req.user = {
    id: validation.userId,
    portal: validation.portal,
    roles: validation.roles,
    email: validation.email,
  };
  
  next();
}

/**
 * Portal guard middleware
 */
function portalGuard(expectedPortal) {
  return (req, res, next) => {
    if (!req.user || req.user.portal !== expectedPortal) {
      return res.status(403).json({
        error: {
          message: `Access denied: ${expectedPortal} portal required`,
          code: 'PORTAL_FORBIDDEN'
        }
      });
    }
    next();
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Auth routes - proxy to auth service
app.use('/auth', (req, res, next) => {
  // Public auth endpoints don't need validation
  const publicPaths = ['/login', '/register', '/otp', '/refresh', '/admin/login', '/customer/login', '/dealer/login'];
  if (publicPaths.some(path => req.path.includes(path))) {
    return proxy(AUTH_SERVICE_URL, {
      proxyReqPathResolver: () => req.url,
    })(req, res, next);
  }
  // Protected auth endpoints (logout, /me, /validate) need validation
  gatewayAuth(req, res, () => {
    proxy(AUTH_SERVICE_URL, {
      proxyReqPathResolver: () => req.url,
    })(req, res, next);
  });
});

// Admin routes - require admin portal
app.use('/api/admin', gatewayAuth, portalGuard('admin'), proxy(ADMIN_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/admin${req.url.replace('/api/admin', '')}`;
  },
}));

// Customer routes - require customer portal
app.use('/api/customer', gatewayAuth, portalGuard('customer'), proxy(CUSTOMER_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/customer${req.url.replace('/api/customer', '')}`;
  },
}));

// Public routes (categories, listings, etc.) - optional auth
app.use('/api', async (req, res, next) => {
  // Try to validate token, but don't fail if missing (for public routes)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Has token - validate and set headers
    try {
      const token = authHeader.split(' ')[1];
      const validation = await validateToken(token);
      if (validation.valid) {
        req.headers['x-user-id'] = validation.userId;
        req.headers['x-user-portal'] = validation.portal;
        req.headers['x-user-roles'] = JSON.stringify(validation.roles);
        req.headers['x-user-email'] = validation.email || '';
        req.headers['x-internal-service-secret'] = INTERNAL_SERVICE_SECRET;
        delete req.headers.authorization;
      }
    } catch (err) {
      // Invalid token - continue without headers (public route)
    }
  }
  // Proxy to customer service (with or without headers)
  proxy(CUSTOMER_SERVICE_URL, {
    proxyReqPathResolver: () => req.url,
  })(req, res, next);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`   Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`   Admin Service: ${ADMIN_SERVICE_URL}`);
  console.log(`   Customer Service: ${CUSTOMER_SERVICE_URL}`);
});

module.exports = app;
