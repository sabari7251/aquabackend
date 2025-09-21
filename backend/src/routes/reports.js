const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const upload = require('../middleware/upload'); // It now imports the new, stable upload middleware
const logger = require('../utils/logger');

const router = express.Router();

const validateReportCreation = [
  body('hazardType').isIn(['flood', 'high-waves', 'coastal-erosion', 'storm-surge', 'tsunami', 'oil-spill', 'marine-debris', 'red-tide', 'infrastructure-damage', 'other']),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('description').trim().isLength({ min: 10, max: 2000 }),
  body('location.coordinates.0').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('location.coordinates.1').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('consentGiven').isBoolean().toBoolean()
];

// @route   POST /api/reports
// @desc    Create a new report
router.post('/', auth, upload.single('media'), validateReportCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { hazardType, severity, description, location, consentGiven } = req.body;
    
    const report = new Report({
      userId: req.user.id,
      hazardType,
      severity,
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
      consentGiven
    });

    await report.save();

    logger.info(`Report created: ${report.id} by user ${req.user.id}`);
    res.status(201).json({ success: true, data: report });

  } catch (error) {
    logger.error('Report creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- All other routes remain the same ---

router.get('/', auth, async (req, res) => {
  try {
    const { status, hazardType, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (hazardType) query.hazardType = hazardType;
    const sortOptions = { [sortBy]: order === 'desc' ? -1 : 1 };
    const reports = await Report.find(query).populate('userId', 'firstName lastName').sort(sortOptions).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Report.countDocuments(query);
    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('userId', 'firstName lastName').populate('verifiedById', 'firstName lastName');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Get single report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/verify', auth, requireRole(['verifier', 'admin']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Report is not pending verification' });
    }
    report.status = 'verified';
    report.verifiedById = req.user.id;
    report.verifiedAt = new Date();
    await report.save();
    logger.info(`Report verified: ${report.id} by user ${req.user.id}`);
    res.json({ success: true, message: 'Report verified successfully', data: report });
  } catch (error) {
    logger.error('Verify report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;