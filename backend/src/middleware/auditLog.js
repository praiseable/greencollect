/**
 * Audit Logging Middleware
 * 
 * Logs all mutating operations (POST/PATCH/DELETE) for compliance and security auditing.
 * Skill requirement: Every mutating route in admin and vendor services must have auditLog middleware.
 */

const prisma = require('../services/prisma');

/**
 * Audit log middleware
 * Logs the action, entity, and changes made
 * 
 * @param {string} entity - Entity type (e.g., 'User', 'Listing', 'Category')
 * @param {Function} getEntityId - Function to extract entity ID from request (req) => string
 * @param {Function} getChanges - Optional function to extract changes from request (req) => object
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/users', authenticate, auditLog('User', (req) => req.body.id), async (req, res) => { ... });
 */
const auditLog = (entity, getEntityId, getChanges = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      // Only log successful mutating operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.id;
          const entityId = getEntityId ? getEntityId(req) : null;
          const changes = getChanges ? getChanges(req) : req.body;
          
          // Create audit log entry
          await prisma.auditLog.create({
            data: {
              userId: userId || null,
              entity: entity,
              entityId: entityId || null,
              action: req.method, // POST, PUT, PATCH, DELETE
              newData: changes ? changes : null, // Store as JSON (Prisma handles conversion)
              ipAddress: req.ip || req.connection?.remoteAddress || null,
            },
          });
        } catch (err) {
          // Don't fail the request if audit logging fails
          console.error('Audit log error:', err);
        }
      }
      
      // Call original res.json
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Simple audit log - logs action without entity details
 * @param {string} action - Action description (e.g., 'User created', 'Listing updated')
 * @returns {Function} Express middleware
 */
const simpleAuditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              entity: 'System',
              entityId: null,
              action: action,
              newData: req.body, // Store as JSON (Prisma handles conversion)
              ipAddress: req.ip || req.connection?.remoteAddress || null,
            },
          });
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = { auditLog, simpleAuditLog };
