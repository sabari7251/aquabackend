const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

const initializeTransporter = () => {
  if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    logger.warn('Email service not configured. Email notifications will be disabled.');
    return;
  }

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Verify the connection in the background, but don't let it crash the app
  transporter.verify((error) => {
    if (error) {
      logger.error('Email service connection failed. Emails will not be sent.', error);
      transporter = null; // Disable the transporter if verification fails
    } else {
      logger.info('Email service connected and ready.');
    }
  });
};

initializeTransporter();

// ... rest of the file
