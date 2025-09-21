const express = require('express');
const { query, validationResult } = require('express-validator');
const Report = require('../models/Report'); // Mongoose Report model
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
router.get('/dashboard', auth, requireRole(['analyst', 'admin']), async (req, res) => {
  try {
    const { dateRange = '30d', hazardType } = req.query;

    // --- Mongoose Change ---
    // Calculate date range
    const now = new Date();
    const dateMap = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };
    const startDate = dateMap[dateRange];

    // --- Mongoose Change ---
    // Build aggregation pipeline
    const matchStage = {
      createdAt: { $gte: startDate }
    };
    if (hazardType) {
      matchStage.hazardType = hazardType;
    }

    const dashboardData = await Report.aggregate([
      { $match: matchStage }, // Filter documents by date range and hazard type
      {
        $facet: { // Process multiple aggregation pipelines in a single stage
          "totalReports": [
            { $count: "count" }
          ],
          "statusBreakdown": [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          "severityBreakdown": [
            { $group: { _id: "$severity", count: { $sum: 1 } } }
          ],
          "reportsOverTime": [
            { $group: { 
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
                count: { $sum: 1 } 
              } 
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);
    
    // Format the results
    const result = dashboardData[0];
    const formattedData = {
        totalReports: result.totalReports[0] ? result.totalReports[0].count : 0,
        statusBreakdown: result.statusBreakdown.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        severityBreakdown: result.severityBreakdown.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        reportsOverTime: result.reportsOverTime
    };

    res.json({ success: true, data: formattedData });

  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;