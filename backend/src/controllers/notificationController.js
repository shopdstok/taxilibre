const { NotificationPreferences, DeviceToken } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const notificationService = require('../services/notificationService')
const AppError = require('../middleware/errorMiddleware').AppError

class NotificationController {
  /**
   * Get notification preferences for the current user
   */
  async getPreferences (req, res, next) {
    try {
      const userId = req.userId
      let preferences = await NotificationPreferences.findOne({ where: { userId } })

      if (!preferences) {
        // Create default preferences if not exist
        preferences = await NotificationPreferences.create({
          userId,
          push: { enabled: true, rideUpdates: true, promotions: true, emergency: true },
          email: { enabled: true, receipts: true, promotions: false, newsletters: false },
          sms: { enabled: false, emergency: true, rideUpdates: false },
          inApp: { enabled: true, rideUpdates: true, promotions: true, messages: true }
        })
      }

      sendSuccess(res, {
        preferences: preferences.toJSON()
      }, 'Notification preferences retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update notification preferences for the current user
   */
  async updatePreferences (req, res, next) {
    try {
      const userId = req.userId
      const { push, email, sms, inApp } = req.body

      const preferences = await NotificationPreferences.findOne({ where: { userId } })
      if (!preferences) {
        throw new AppError('Notification preferences not found', 404, 'PREFERENCES_NOT_FOUND')
      }

      // Update only the provided fields
      const updateData = {}
      if (push !== undefined) updateData.push = push
      if (email !== undefined) updateData.email = email
      if (sms !== undefined) updateData.sms = sms
      if (inApp !== undefined) updateData.inApp = inApp

      await preferences.update(updateData)

      res.json(successResponse({
        preferences: preferences.toJSON()
      }, 'Notification preferences updated successfully'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get notification history for the current user
   * Note: This would require a Notification model to store past notifications.
   * For now, we return an empty array as a placeholder.
   */
  async getHistory (req, res, next) {
    try {
      const userId = req.userId
      const { limit = 20, offset = 0 } = req.query

      // In a real implementation, we would query a Notifications table
      // For now, return mock data or empty array
      const notifications = [] // Placeholder

      res.json(successResponse({
        notifications,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: notifications.length
        }
      }, 'Notification history retrieved successfully'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark a notification as read
   * Note: This would require a Notification model.
   */
  async markAsRead (req, res, next) {
    try {
      const { notificationId } = req.params
      const userId = req.userId

      // In a real implementation, we would update the notification in the database
      // For now, just return success
      res.json(successResponse(null, 'Notification marked as read'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead (req, res, next) {
    try {
      const userId = req.userId
      // In a real implementation, we would update all notifications for the user
      res.json(successResponse(null, 'All notifications marked as read'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount (req, res, next) {
    try {
      const userId = req.userId
      // In a real implementation, we would count unread notifications
      const count = 0 // Placeholder

      res.json(successResponse({
        count
      }, 'Unread notification count retrieved successfully'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice (req, res, next) {
    try {
      const userId = req.userId
      const { deviceType, fcmToken, deviceId, deviceName } = req.body

      if (!deviceType || !fcmToken || !deviceId) {
        throw new AppError('deviceType, fcmToken, and deviceId are required', 400, 'MISSING_FIELDS')
      }

      // Check if device already exists for this user
      let deviceToken = await DeviceToken.findOne({ where: { userId, deviceId } })

      if (deviceToken) {
        // Update existing device
        await deviceToken.update({
          fcmToken,
          deviceType,
          deviceName: deviceName || deviceToken.deviceName,
          isActive: true,
          lastUsedAt: new Date()
        })
      } else {
        // Create new device token
        deviceToken = await DeviceToken.create({
          userId,
          deviceType,
          fcmToken,
          deviceId,
          deviceName,
          isActive: true,
          lastUsedAt: new Date()
        })
      }

      res.json(successResponse({
        device: deviceToken.toJSON()
      }, 'Device registered for push notifications successfully'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Unregister a device from push notifications
   */
  async unregisterDevice (req, res, next) {
    try {
      const userId = req.userId
      const { deviceId } = req.body

      if (!deviceId) {
        throw new AppError('deviceId is required', 400, 'MISSING_DEVICE_ID')
      }

      await DeviceToken.update(
        { isActive: false },
        { where: { userId, deviceId } }
      )

      res.json(successResponse(null, 'Device unregistered successfully'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get user's registered devices
   */
  async getDevices (req, res, next) {
    try {
      const userId = req.userId
      const devices = await DeviceToken.findAll({
        where: { userId, isActive: true }
      })

      res.json(successResponse({
        devices: devices.map(device => device.toJSON())
      }, 'Devices retrieved successfully'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new NotificationController()

