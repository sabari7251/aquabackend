const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes by verifying a user's JWT token.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const auth = (req, res, next) => {
  // 1. Get the token from the request header
  const authHeader = req.header('Authorization');

  // 2. Check if there's no token
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  // Check if the token is in the correct 'Bearer <token>' format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Invalid token format.' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' from the string

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. If valid, attach the user's info to the request object
    // This allows subsequent routes to know who the logged-in user is.
    req.user = decoded.user;
    
    // 5. Proceed to the next middleware or route handler
    next();

  } catch (error) {
    logger.warn('Token verification failed:', { error: error.message, ip: req.ip });
    res.status(401).json({ success: false, message: 'Token is not valid.' });
  }
};

module.exports = auth;