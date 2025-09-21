const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Debug environment loading
console.log('--- ENVIRONMENT DEBUG ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI preview:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'undefined');

// Retrieve the MongoDB connection string from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ocean_hazard_db';

/**
 * Connects to the MongoDB database with enhanced error handling and debugging.
 */
const connectDB = async () => {
  try {
    console.log('--- ATTEMPTING MONGODB CONNECTION ---');
    console.log('MongoDB URI (masked):', MONGO_URI.replace(/:[^:]*@/, ':***@'));
    
    // FIXED: Removed deprecated bufferMaxEntries option
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true, // Enable retryable writes
      w: 'majority', // Write concern
    };

    // Add connection event listeners before connecting
    mongoose.connection.on('connecting', () => {
      console.log('--- MONGOOSE: Attempting to connect to MongoDB ---');
    });

    mongoose.connection.on('connected', () => {
      console.log('--- MONGOOSE: Successfully connected to MongoDB ---');
      logger.info('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('--- MONGOOSE CONNECTION ERROR ---');
      console.error('Error details:', err);
      logger.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('--- MONGOOSE: Disconnected from MongoDB ---');
      logger.warn('Mongoose disconnected from DB');
    });

    // Attempt connection
    await mongoose.connect(MONGO_URI, options);
    
    console.log('--- MONGODB CONNECTION SUCCESSFUL ---');
    logger.info(`MongoDB connected successfully to cluster`);
    
    // Test the connection by running a simple query
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    console.log('--- DATABASE PING SUCCESSFUL ---', result);
    
  } catch (error) {
    console.error('--- MONGODB CONNECTION FAILED ---');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    // Provide specific error guidance
    if (error.name === 'MongoServerSelectionError') {
      console.error('❌ Server Selection Error - Possible causes:');
      console.error('   • IP address not whitelisted in MongoDB Atlas');
      console.error('   • Incorrect connection string');
      console.error('   • Network connectivity issues');
      console.error('   • MongoDB cluster is paused or unavailable');
    } else if (error.name === 'MongoParseError') {
      console.error('❌ Connection String Parse Error - Check your MONGO_URI format');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('❌ Authentication Error - Check username/password');
    }
    
    logger.error('MongoDB connection failed:', error.message);
    
    // Don't exit process immediately in development for debugging
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('--- CONTINUING WITHOUT DATABASE (DEVELOPMENT MODE) ---');
    }
  }
};

/**
 * Closes the MongoDB connection.
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('--- MONGODB CONNECTION CLOSED ---');
    logger.info('MongoDB connection closed.');
  } catch (error) {
    console.error('--- ERROR CLOSING MONGODB CONNECTION ---');
    console.error('Error:', error.message);
    logger.error('Error closing MongoDB connection:', error.message);
  }
};

/**
 * Check if MongoDB is connected
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, closeDB, isConnected };