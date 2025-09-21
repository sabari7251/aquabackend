const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the full error for debugging purposes
  logger.error('Error Handler Caught:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    url: req.originalUrl,
  });

  // --- Mongoose Error Handling ---

  // Mongoose Bad ObjectId (e.g., invalid ID format in URL)
  if (err.name === 'CastError') {
    const message = `Resource not found with invalid ID: ${err.value}`;
    error = { message, statusCode: 404 };
  }

  // Mongoose Duplicate Key (e.g., trying to register with an existing email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for '${field}'. Please use another value.`;
    error = { message, statusCode: 409 }; // 409 Conflict
  }

  // Mongoose Validation Error (e.g., required field is missing)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 }; // 400 Bad Request
  }

  // --- General Error Handling (Mostly unchanged) ---

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = { message, statusCode: 401 };
  }
  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please log in again.';
    error = { message, statusCode: 401 };
  }

  // Multer (File Upload) errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File is too large. Please upload a smaller file.';
    error = { message, statusCode: 400 };
  }

  // --- Final Response ---
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};

module.exports = errorHandler;