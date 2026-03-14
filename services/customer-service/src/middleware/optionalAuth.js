/**
 * Optional Auth Middleware
 * 
 * For microservices: Extracts user info from X-User-* headers if present.
 * Doesn't fail if headers are missing (for public routes).
 */

function optionalAuth(req, res, next) {
  // Check if headers are present (set by gateway)
  const userId = req.headers['x-user-id'];
  const portal = req.headers['x-user-portal'];
  const roles = req.headers['x-user-roles'] ? JSON.parse(req.headers['x-user-roles']) : [];
  const email = req.headers['x-user-email'];
  
  if (userId) {
    // User is authenticated - attach to request
    req.user = {
      id: userId,
      portal: portal,
      roles: roles,
      email: email,
    };
  }
  
  // Set language from header or default
  req.lang = req.headers['accept-language']?.split(',')[0]?.trim() || 'en';
  
  next();
}

module.exports = optionalAuth;
