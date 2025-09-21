const logger = require('../utils/logger');

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role} to resource requiring roles: ${allowedRoles.join(', ')}`);
        
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

/**
 * Check if user can verify reports
 */
const canVerifyReports = (req, res, next) => {
  return requireRole(['verifier', 'analyst', 'admin'])(req, res, next);
};

/**
 * Check if user can manage other users
 */
const canManageUsers = (req, res, next) => {
  return requireRole(['admin'])(req, res, next);
};

/**
 * Check if user can access analytics
 */
const canAccessAnalytics = (req, res, next) => {
  return requireRole(['analyst', 'admin'])(req, res, next);
};

/**
 * Check if user owns the resource or has admin privileges
 * @param {Function} getResourceOwner - Function to get the owner ID from the resource
 */
const requireOwnershipOrAdmin = (getResourceOwner) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the resource owner ID
      const ownerId = await getResourceOwner(req);
      
      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user owns the resource
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

/**
 * Rate limiting based on user role
 */
const roleBasedRateLimit = {
  citizen: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // limit each citizen to 50 requests per windowMs
  },
  verifier: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  analyst: {
    windowMs: 15 * 60 * 1000,
    max: 200
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 500
  }
};

module.exports = {
  requireRole,
  canVerifyReports,
  canManageUsers,
  canAccessAnalytics,
  requireOwnershipOrAdmin,
  roleBasedRateLimit
};