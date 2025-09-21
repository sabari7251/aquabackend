const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User'); // Mongoose User model
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get users list (admin only)
router.get('/', auth, requireRole(['admin']), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['citizen', 'verifier', 'analyst', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { page = 1, limit = 20, role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // --- Mongoose Change ---
    // Build query object
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [ // Mongoose syntax for OR condition
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Mongoose sort syntax
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const users = await User.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (admin only)
router.get('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    // --- Mongoose Change ---
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get single user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;