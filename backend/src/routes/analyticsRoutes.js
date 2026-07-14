const express = require('express')
const router = express.Router()
const AnalyticsController = require('../controllers/analyticsController')
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware')

// All analytics routes require authentication and admin role
router.use(authenticateToken, requireAdmin)

// Dashboard KPIs
router.get('/dashboard', AnalyticsController.getDashboard)

// Real-time stats
router.get('/realtime', AnalyticsController.getRealTimeStats)

// Rides time series
router.get('/rides/timeseries', AnalyticsController.getRidesTimeSeries)

// Top drivers
router.get('/drivers/top', AnalyticsController.getTopDrivers)

// Ride heatmap
router.get('/rides/heatmap', AnalyticsController.getRideHeatmap)

// Vehicle stats
router.get('/vehicles/stats', AnalyticsController.getVehicleStats)

// Cancellation reasons
router.get('/cancellations/reasons', AnalyticsController.getCancellationReasons)

// User growth
router.get('/users/growth', AnalyticsController.getUserGrowth)

// Revenue
router.get('/revenue', AnalyticsController.getRevenue)

module.exports = router
