const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notificationController')
const { authenticateToken } = require('../middleware/authMiddleware')

// All notification routes require authentication
router.use(authenticateToken)

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access   Private
 */
router.get('/preferences', notificationController.getPreferences)

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access   Private
 */
router.put('/preferences', notificationController.updatePreferences)

/**
 * @route   GET /api/v1/notifications/history
 * @desc    Get notification history
 * @access   Private
 */
router.get('/history', notificationController.getHistory)

/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access   Private
 */
router.put('/:notificationId/read', notificationController.markAsRead)

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access   Private
 */
router.put('/read-all', notificationController.markAllAsRead)

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access   Private
 */
router.get('/unread-count', notificationController.getUnreadCount)

/**
 * @route   POST /api/v1/notifications/register-device
 * @desc    Register device for push notifications
 * @access   Private
 */
router.post('/register-device', notificationController.registerDevice)

/**
 * @route   POST /api/v1/notifications/unregister-device
 * @desc    Unregister device from push notifications
 * @access   Private
 */
router.post('/unregister-device', notificationController.unregisterDevice)

/**
 * @route   GET /api/v1/notifications/devices
 * @desc    Get user's registered devices
 * @access   Private
 */
router.get('/devices', notificationController.getDevices)

module.exports = router
