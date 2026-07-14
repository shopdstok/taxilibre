const express = require('express')
const router = express.Router()
const GeofencingController = require('../controllers/geofencingController')
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware')

// Public routes
router.get('/check', GeofencingController.checkLocation)
router.get('/surge', GeofencingController.getSurgeStatus)

// Protected routes (admin only for management)
router.get('/zones', authenticateToken, requireAdmin, GeofencingController.getZones)
router.get('/zones/:id', authenticateToken, requireAdmin, GeofencingController.getZoneById)

// Admin only routes
router.post('/zones', authenticateToken, requireAdmin, GeofencingController.createZone)
router.put('/zones/:id', authenticateToken, requireAdmin, GeofencingController.updateZone)
router.delete('/zones/:id', authenticateToken, requireAdmin, GeofencingController.deleteZone)

// Route validation
router.post('/validate-route', GeofencingController.validateRoute)

// Get drivers in zone
router.get('/zones/:zoneId/drivers', authenticateToken, requireAdmin, GeofencingController.getDriversInZone)

module.exports = router
