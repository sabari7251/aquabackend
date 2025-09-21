const express = require('express');
const { query, validationResult } = require('express-validator');
const Report = require('../models/Report'); // Mongoose Report model
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/map/reports
// @desc    Get reports for map display with location filtering
router.get('/reports', auth, [
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }), // radius in km
  query('bounds').optional().matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { lat, lng, radius, bounds, status, severity } = req.query;

    // --- Mongoose Change ---
    // Build geospatial query
    const geoQuery = {};
    if (bounds) {
      const [swLng, swLat, neLng, neLat] = bounds.split(',').map(parseFloat);
      geoQuery.location = {
        $geoWithin: {
          $box: [ [swLng, swLat], [neLng, neLat] ]
        }
      };
    } else if (lat && lng && radius) {
      geoQuery.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      };
    }

    // Build filter query
    const filterQuery = {};
    if (status && status !== 'all') filterQuery.status = status;
    if (severity) filterQuery.severity = severity;

    const finalQuery = { ...geoQuery, ...filterQuery };

    // Find reports matching the query
    const reports = await Report.find(finalQuery)
      .select('location severity status hazardType') // Select only needed fields for the map
      .limit(500); // Limit results for performance

    res.json({ success: true, data: reports });

  } catch (error) {
    logger.error('Map reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;