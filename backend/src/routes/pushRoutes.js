const express = require('express')
const router = express.Router()
const PushController = require('../controllers/pushController')
const { authenticateToken } = require('../middleware/authMiddleware')

// All push notification routes require authentication
router.use(authenticateToken)

// Register device
router.post('/register', PushController.register)

// Unregister device
router.post('/unregister', PushController.unregister)

// Get devices
router.get('/devices', PushController.getDevices)

// Update preferences
router.put('/preferences', PushController.updatePreferences)

// Send test notification
router.post('/test', PushController.sendTest)

// Subscribe to topic
router.post('/subscribe-topic', PushController.subscribeToTopic)

module.exports = router
