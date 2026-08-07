const { logger } = require('./loggingService')
const { Notification, DeviceToken } = require('../models')
const pushNotificationService = require('./pushNotificationService')
const emailService = require('./emailService')
const smsService = require('./smsService')
const socketService = require('./socketService')
const { Op } = require('sequelize')

/**
 * Notification Service
 * Handles all types of notifications: push, SMS, email, and in-app
 */
class NotificationService {
  /**
   * Send push notification to user via FCM
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object {title, body, data}
   * @returns {Promise<Object>} Result object
   */
  async sendPushNotification (userId, notification) {
    try {
      const result = await pushNotificationService.sendToUser(userId, notification)
      
      // Log to audit trail
      await this._logNotification(userId, 'push', notification, result)
      
      return result
    } catch (error) {
      logger.error('Failed to send push notification', { 
        userId, 
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send SMS to user via Twilio
   * @param {string} userId - User ID
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} Result object
   */
  async sendSMS (userId, message) {
    try {
      // Get user's phone number from user model
      const { User } = require('../models')
      const user = await User.findByPk(userId)
      
      if (!user || !user.phoneNumber) {
        return { success: false, error: 'User phone number not found' }
      }
      
      const result = await smsService.sendSMS(user.phoneNumber, message)
      
      // Log to audit trail
      await this._logNotification(userId, 'sms', { body: message }, result)
      
      return result
    } catch (error) {
      logger.error('Failed to send SMS', { 
        userId, 
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send email to user via SMTP/SendGrid
   * @param {string} userId - User ID
   * @param {string} subject - Email subject
   * @param {string} text - Email body text
   * @param {string} html - Optional HTML body
   * @returns {Promise<Object>} Result object
   */
  async sendEmail (userId, subject, text, html = null) {
    try {
      // Get user's email from user model
      const { User } = require('../models')
      const user = await User.findByPk(userId)
      
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' }
      }
      
      const result = await emailService.sendEmail(user.email, subject, text, html)
      
      // Log to audit trail
      await this._logNotification(userId, 'email', { subject, text, html }, result)
      
      return result
    } catch (error) {
      logger.error('Failed to send email', { 
        userId, 
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Create in-app notification (store in DB + emit via socket)
   * @param {Object} notificationData - Notification data {userId, type, title, message, data, priority, expiry}
   * @returns {Promise<Object>} Created notification object
   */
  async createInAppNotification (notificationData) {
    const { userId, type, title, message, data = {}, priority = 'NORMAL', expiresAt } = notificationData
    
    try {
      // Create notification in database
      const notification = await Notification.create({
        userId,
        title,
        message,
        type: type.toUpperCase(), // Ensure enum compatibility
        priority,
        data,
        expiresAt
      })
      
      // Emit via socket service for real-time delivery
      socketService.sendToUser(userId, 'notification:created', {
        id: notification.id,
        userId,
        title,
        message,
        type: notification.type,
        priority: notification.priority,
        data: notification.data,
        createdAt: notification.createdAt
      })
      
      // Log to audit trail
      await this._logNotification(userId, 'in_app', notificationData, { success: true, notificationId: notification.id })
      
      return notification
    } catch (error) {
      logger.error('Failed to create in-app notification', { 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Result object
   */
  async markAsRead (notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          userId
        }
      })
      
      if (!notification) {
        return { success: false, error: 'Notification not found' }
      }
      
      notification.isRead = true
      notification.readAt = new Date()
      await notification.save()
      
      // Emit via socket service
      socketService.sendToUser(userId, 'notification:read', {
        notificationId,
        userId,
        readAt: notification.readAt
      })
      
      // Log to audit trail
      await this._logNotification(userId, 'mark_as_read', { notificationId }, { success: true })
      
      return { success: true }
    } catch (error) {
      logger.error('Failed to mark notification as read', { 
        notificationId, 
        userId,
        error: error.message 
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Get unread notifications for user
   * @param {string} userId - User ID
   * @param {number} limit - Limit number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of unread notifications
   */
  async getUnreadNotifications (userId, limit = 50, offset = 0) {
    try {
      const notifications = await Notification.findAll({
        where: {
          userId,
          isRead: false,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      })
      
      return notifications
    } catch (error) {
      logger.error('Failed to get unread notifications', { 
        userId, 
        error: error.message 
      })
      return []
    }
  }

  /**
   * Send notification via multiple channels
   * @param {Object} options - {userId, type, title, message, data, channels}
   * @returns {Promise<Object>} Combined results
   */
  async sendNotification ({ userId, type, title, message, data = {}, channels = ['push'] }) {
    const results = { success: true, channels: {}, errors: [] }
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'push':
            results.channels.push = await this.sendPushNotification(userId, { title, body: message, data })
            break
          case 'sms':
            results.channels.sms = await this.sendSMS(userId, message)
            break
          case 'email':
            results.channels.email = await this.sendEmail(userId, title, message)
            break
          case 'in_app':
            results.channels.in_app = await this.createInAppNotification({ 
              userId, 
              type, 
              title, 
              message, 
              data 
            })
            break
          default:
            results.errors.push({ channel, error: 'Unsupported channel' })
        }
      } catch (error) {
        results.errors.push({ channel, error: error.message })
        logger.error('Notification failed', { userId, channel, error: error.message })
      }
    }
    
    if (results.errors.length > 0) {
      results.success = results.errors.length < channels.length
    }
    
    // Log overall notification
    await this._logNotification(userId, 'multi_channel', { type, title, message, channels }, results)
    
    return results
  }

  /**
   * Send ride request notification (template)
   * @param {string} driverId - Driver ID
   * @param {Object} ride - Ride object
   * @returns {Promise<Object>} Result
   */
  async notifyRideRequest (driverId, ride) {
    return this.sendNotification({
      userId: driverId,
      type: 'RIDE_REQUEST',
      title: 'Nouvelle course',
      message: `Course de ${ride.pickupAddress} à ${ride.dropoffAddress}`,
      data: { rideId: ride.id },
      channels: ['push', 'sms', 'in_app']
    })
  }

  /**
   * Send driver assigned notification (template)
   * @param {string} passengerId - Passenger ID
   * @param {Object} ride - Ride object
   * @param {Object} driver - Driver object
   * @returns {Promise<Object>} Result
   */
  async notifyDriverAssigned (passengerId, ride, driver) {
    return this.sendNotification({
      userId: passengerId,
      type: 'DRIVER_ASSIGNED',
      title: 'Chauffeur trouvé',
      message: `${driver.name} arrive dans ${ride.eta || 5} min`,
      data: { rideId: ride.id, driverId: driver.id },
      channels: ['push', 'in_app']
    })
  }

  /**
   * Send driver arrived notification (template)
   * @param {string} passengerId - Passenger ID
   * @param {Object} ride - Ride object
   * @param {Object} driver - Driver object
   * @returns {Promise<Object>} Result
   */
  async notifyDriverArrived (passengerId, ride, driver) {
    return this.sendNotification({
      userId: passengerId,
      type: 'DRIVER_ARRIVED',
      title: 'Votre chauffeur est arrivé',
      message: `${driver.name} est arrivé à votre point de prise en charge`,
      data: { rideId: ride.id, driverId: driver.id },
      channels: ['push', 'sms', 'in_app']
    })
  }

  /**
   * Send ride completed notification (template)
   * @param {string} passengerId - Passenger ID
   * @param {Object} ride - Ride object
   * @returns {Promise<Object>} Result
   */
  async notifyRideCompleted (passengerId, ride) {
    return this.sendNotification({
      userId: passengerId,
      type: 'RIDE_COMPLETED',
      title: 'Course terminée',
      message: `Votre course de ${ride.totalAmount || ride.finalPrice}€ est terminée`,
      data: { rideId: ride.id },
      channels: ['push', 'email', 'in_app']
    })
  }

  /**
   * Send payment received notification (template)
   * @param {string} driverId - Driver ID
   * @param {number} amount - Payment amount
   * @returns {Promise<Object>} Result
   */
  async notifyPaymentReceived (driverId, amount) {
    return this.sendNotification({
      userId: driverId,
      type: 'PAYMENT_RECEIVED',
      title: 'Paiement reçu',
      message: `Vous avez reçu ${amount}€ pour votre course`,
      data: { amount },
      channels: ['push', 'email', 'in_app']
    })
  }

  /**
   * Send bulk notification to multiple users
   * @param {Object} options - {userIds, title, message, channels}
   * @returns {Promise<Object>} Bulk results
   */
  async sendBulkNotification ({ userIds, title, message, channels = ['push'] }) {
    const results = { successCount: 0, failureCount: 0, total: userIds.length }
    
    for (const userId of userIds) {
      try {
        await this.sendNotification({ userId, type: 'BULK', title, message, channels })
        results.successCount++
      } catch (error) {
        results.failureCount++
        logger.error('Failed to send bulk notification to user', { 
          userId, 
          error: error.message 
        })
      }
    }
    
    return results
  }

  /**
   * Log notification to audit trail (private)
   * @private
   */
  async _logNotification (userId, channel, notificationData, result) {
    try {
      const { AuditLog } = require('../models')
      await AuditLog.create({
        action: 'notification_sent',
        userId,
        details: {
          type: notificationData.type || notificationData.title,
          channel,
          notification: notificationData,
          result
        }
      }).catch(() => {}) // Don't fail if audit log fails
    } catch (error) {
      // Don't let logging errors break the notification flow
      logger.warn('Failed to log notification to audit trail', { 
        userId, 
        error: error.message 
      })
    }
  }
}

module.exports = new NotificationService()