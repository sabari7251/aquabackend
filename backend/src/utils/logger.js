const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(colors);

// Create custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack } = info;
    
    if (stack) {
      return `${timestamp} ${level}: ${message}\n${stack}`;
    }
    
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: format
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 10
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add custom methods for specific use cases
logger.logRequest = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.url} ${res.statusCode} ${responseTime}ms - ${req.ip}`);
};

logger.logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...context
  };
  
  logger.error('Application Error:', errorInfo);
};

logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security Event - ${event}:`, details);
};

logger.logDatabase = (operation, details = {}) => {
  logger.debug(`Database Operation - ${operation}:`, details);
};

logger.logAuth = (event, userId, details = {}) => {
  logger.info(`Auth Event - ${event}:`, {
    userId,
    ...details
  });
};

logger.logReport = (action, reportId, userId, details = {}) => {
  logger.info(`Report Action - ${action}:`, {
    reportId,
    userId,
    ...details
  });
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: fileFormat
  })
);

// Handle unhandled rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: fileFormat
  })
);

module.exports = logger;