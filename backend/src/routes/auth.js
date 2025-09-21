console.log('--- Loading: ./routes/auth.js ---');

const express = require('express');
console.log('--- auth.js: Loaded express ---');

const jwt = require('jsonwebtoken');
console.log('--- auth.js: Loaded jsonwebtoken ---');

const { body, validationResult } = require('express-validator');
console.log('--- auth.js: Loaded express-validator ---');

const User = require('../models/User');
console.log('--- auth.js: Loaded User model ---');

const auth = require('../middleware/auth');
console.log('--- auth.js: Loaded auth middleware ---');

const logger = require('../utils/logger');
console.log('--- auth.js: Loaded logger utility ---');

// ADD THIS TRY-CATCH BLOCK AROUND THE EMAIL SERVICE IMPORT
console.log('--- auth.js: About to load emailService utility ---');
let sendWelcomeEmail;
try {
  const emailService = require('../utils/emailService');
  sendWelcomeEmail = emailService.sendWelcomeEmail;
  console.log('--- auth.js: Successfully loaded emailService utility ---');
} catch (error) {
  console.error('--- auth.js: FAILED to load emailService utility ---', error);
  // Provide a fallback function if email service fails
  sendWelcomeEmail = async () => {
    console.log('--- Email service unavailable, skipping welcome email ---');
  };
}

console.log('--- auth.js: All imports completed ---');

// --- End of imports ---

const router = express.Router();

const validateRegistration = [
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('role').optional().isIn(['citizen', 'verifier', 'analyst']).withMessage('Invalid role specified')
];

router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { firstName, lastName, email, password, role } = req.body;
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }
    user = new User({ firstName, lastName, email, password, role });
    await user.save();
    await sendWelcomeEmail(user.email, user.firstName);
    logger.info(`New user registered: ${user.email}`);
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    logger.info(`User logged in: ${user.email}`);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

console.log('--- Successfully compiled: ./routes/auth.js ---');