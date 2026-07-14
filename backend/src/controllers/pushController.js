const PushNotificationService = require('../services/pushNotificationService')
const { PushSubscription } = require('../models')

class PushController {
  /**
   * Register device for push notifications
   */
  static async register (req, res) {
    try {
      const userId = req.user.id
      const { deviceType, fcmToken, deviceId, deviceName } = req.body

      if (!deviceType || !fcmToken || !deviceId) {
        return res.status(400).json({
          success: false,
          error: 'deviceType, fcmToken, and deviceId are required'
        })
      }

      const result = await PushNotificationService.saveSubscription(
        userId,
        { deviceType, fcmToken, deviceId, deviceName }
      )

      if (result.success) {
        res.json({
          success: true,
          message: 'Device registered for push notifications',
          subscription: result.subscription
        })
      } else {
        res.status(500).json({ success: false, error: result.error })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Unregister device
   */
  static async unregister (req, res) {
    try {
      const userId = req.user.id
      const { deviceId } = req.body

      await PushSubscription.update(
        { isActive: false },
        { where: { userId, deviceId } }
      )

      res.json({ success: true, message: 'Device unregistered' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences (req, res) {
    try {
      const userId = req.user.id
      const { deviceId, preferences } = req.body

      await PushSubscription.update(
        { preferences },
        { where: { userId, deviceId } }
      )

      res.json({ success: true, message: 'Preferences updated' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Get user's devices
   */
  static async getDevices (req, res) {
    try {
      const userId = req.user.id

      const devices = await PushSubscription.findAll({
        where: { userId },
        attributes: ['id', 'deviceType', 'deviceId', 'deviceName', 'isActive', 'lastUsedAt', 'preferences']
      })

      res.json({ success: true, devices })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Send test notification (admin only)
   */
  static async sendTest (req, res) {
    try {
      const userId = req.user.id

      const result = await PushNotificationService.sendToUser(userId, {
        title: '🔔 Test Notification',
        body: 'This is a test push notification from TaxiLibre!',
        data: { type: 'TEST' }
      })

      if (result.success) {
        res.json({ success: true, message: 'Test notification sent' })
      } else {
        res.status(400).json({ success: false, error: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * Subscribe to topic
   */
  static async subscribeToTopic (req, res) {
    try {
      const userId = req.user.id
      const { topic } = req.body

      await PushNotificationService.subscribeToTopic(userId, topic)

      res.json({ success: true, message: `Subscribed to ${topic}` })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = PushController
