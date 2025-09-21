const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

/**
 * Initializes the Nodemailer transporter safely.
 */
const initializeTransporter = () => {
  // Check if email credentials are provided in the .env file
  if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    // This warning is now handled correctly and will not crash the app.
    logger.warn('Email service not configured. Email notifications will be disabled.');
    return;
  }

  try {
    // FIXED: Use createTransport (not createTransporter)
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify the connection in the background - WRAPPED IN TRY-CATCH
    transporter.verify((error) => {
      if (error) {
        logger.error('Email service connection failed. Emails will not be sent.', error);
        transporter = null; // Disable the transporter if verification fails
      } else {
        logger.info('Email service connected and ready.');
      }
    });
  } catch (error) {
    logger.error('Failed to create email transporter:', error);
    transporter = null;
  }
};

// Call the initialization function once when the app starts
try {
  initializeTransporter();
} catch (error) {
  logger.error('Email service initialization failed:', error);
  // Don't let email service failure crash the entire app
}

/**
 * Sends a welcome email to a new user.
 */
const sendWelcomeEmail = async (email, firstName) => {
  // Check if the transporter is available before trying to send an email
  if (!transporter) {
    logger.warn(`Skipping welcome email to ${email} because email service is not available.`);
    return;
  }

  const mailOptions = {
    from: `Aquasentra <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Aquasentra!',
    html: `<h1>Welcome, ${firstName}!</h1><p>Thank you for joining the Aquasentra platform.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}:`, error);
  }
};

module.exports = {
  sendWelcomeEmail,
};