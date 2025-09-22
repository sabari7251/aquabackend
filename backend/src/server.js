console.log('--- CHECKPOINT 1: server.js is starting ---');

// --- Debugging each import ---
const express = require('express');
console.log('--- Loaded: express ---');

const cors = require('cors');
console.log('--- Loaded: cors ---');

const helmet = require('helmet');
console.log('--- Loaded: helmet ---');

const rateLimit = require('express-rate-limit');
console.log('--- Loaded: express-rate-limit ---');

const compression = require('compression');
console.log('--- Loaded: compression ---');

const morgan = require('morgan');
console.log('--- Loaded: morgan ---');

require('dotenv').config();
console.log('--- Loaded: dotenv ---');

const { connectDB } = require('./config/database'); 
console.log('--- Loaded: ./config/database.js ---');

const authRoutes = require('./routes/auth');
console.log('--- Loaded: ./routes/auth.js ---');

const reportRoutes = require('./routes/reports');
console.log('--- Loaded: ./routes/reports.js ---');

const userRoutes = require('./routes/users');
console.log('--- Loaded: ./routes/users.js ---');

const analyticsRoutes = require('./routes/analytics');
console.log('--- Loaded: ./routes/analytics.js ---');

const mapRoutes = require('./routes/map');
console.log('--- Loaded: ./routes/map.js ---');

const errorHandler = require('./middleware/errorHandler');
console.log('--- Loaded: ./middleware/errorHandler.js ---');

const logger = require('./utils/logger');
console.log('--- Loaded: ./utils/logger.js ---');

// --- End of debugging imports ---

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());



// List of trusted frontend origins
const allowedOrigins = [
  process.env.FRONTEND_URL, // This will be your deployed frontend URL
  'http://localhost:3000',    // Your local frontend
  'http://localhost:8081'     // Your friend's local frontend
].filter(Boolean); // filter(Boolean) removes any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/map', mapRoutes);

app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});


const startServer = async () => {
  try {
    await connectDB();
    // Use '0.0.0.0' to allow the server to accept connections from any host
    app.listen(PORT, '0.0.0.0', () => { 
      logger.info(`🌊 Ocean Hazard Backend Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
