const admin = require('firebase-admin')
const { PushSubscription } = require('../models')

// Initialize Firebase Admin (already done in server.js)
// but ensure we have the messaging service
class PushNotificationService {
  /**
   * Send push notification to specific user
   */
  static async sendToUser (userId, notification) {
    try {
      const subscriptions = await PushSubscription.findAll({
        where: { userId, isActive: true }
      })

      if (subscriptions.length === 0) {
        return { success: false, message: 'No active subscriptions found' }
      }

      const results = []

      for (const sub of subscriptions) {
        if (sub.fcmToken) {
          const result = await this.sendFCM(sub.fcmToken, notification)
          results.push(result)

          // Update last used
          await sub.update({ lastUsedAt: new Date() })
        }
      }

      return {
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send FCM message
   */
  static async sendFCM (token, { title, body, data = {}, imageUrl = null }) {
    try {
      const message = {
        token,
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl })
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'taxilibre_channel',
            sound: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      }

      const response = await admin.messaging().send(message)
      return { success: true, messageId: response }
    } catch (error) {

      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        await this.removeInvalidToken(token)
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * Send notification to multiple users (batch)
   */
  static async sendToMultiple (userIds, notification) {
    const results = await Promise.all(
      userIds.map(userId => this.sendToUser(userId, notification))
    )

    return {
      total: userIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  }

  /**
   * Send notification to topic (broadcast)
   */
  static async sendToTopic (topic, { title, body, data = {} }) {
    try {
      const message = {
        topic,
        notification: { title, body },
        data
      }

      const response = await admin.messaging().send(message)
      return { success: true, messageId: response }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Subscribe user to topic
   */
  static async subscribeToTopic (userId, topic) {
    const subscriptions = await PushSubscription.findAll({
      where: { userId, isActive: true }
    })

    const tokens = subscriptions.map(s => s.fcmToken).filter(Boolean)

    if (tokens.length > 0) {
      await admin.messaging().subscribeToTopic(tokens, topic)
    }

    return { success: true }
  }

  /**
   * Save user push subscription
   */
  static async saveSubscription (userId, { deviceType, fcmToken, deviceId, deviceName }) {
    try {
      // Check if subscription already exists
      let subscription = await PushSubscription.findOne({
        where: { userId, deviceId }
      })

      if (subscription) {
        // Update existing
        await subscription.update({
          fcmToken,
          deviceType,
          deviceName,
          isActive: true,
          lastUsedAt: new Date()
        })
      } else {
        // Create new
        subscription = await PushSubscription.create({
          userId,
          deviceType,
          fcmToken,
          deviceId,
          deviceName,
          isActive: true,
          lastUsedAt: new Date()
        })
      }

      return { success: true, subscription }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove invalid FCM token
   */
  static async removeInvalidToken (token) {
    await PushSubscription.update(
      { isActive: false },
      { where: { fcmToken: token } }
    )
  }

  // ==================== NOTIFICATION TEMPLATES ====================

  static async notifyRideAccepted (userId, { rideId, driverName, eta }) {
    return this.sendToUser(userId, {
      title: 'Chauffeur trouvé !',
      body: `${driverName} arrive dans ${eta} minutes`,
      data: { type: 'RIDE_ACCEPTED', rideId }
    })
  }

  static async notifyDriverArriving (userId, { rideId, driverName, licensePlate }) {
    return this.sendToUser(userId, {
      title: 'Votre chauffeur est arrivé',
      body: `${driverName} vous attend (${licensePlate})`,
      data: { type: 'DRIVER_ARRIVED', rideId }
    })
  }

  static async notifyRideStarted (userId, { rideId, destination }) {
    return this.sendToUser(userId, {
      title: 'Course en cours',
      body: `En route vers ${destination}`,
      data: { type: 'RIDE_STARTED', rideId }
    })
  }

  static async notifyRideCompleted (userId, { rideId, totalPrice, ratingNeeded }) {
    return this.sendToUser(userId, {
      title: 'Course terminée',
      body: `Total: ${totalPrice}€. ${ratingNeeded ? 'N\'oubliez pas de noter !' : 'Merci !'}`,
      data: { type: 'RIDE_COMPLETED', rideId }
    })
  }

  static async notifyNewRideRequest (driverId, { rideId, pickupAddress, estimatedPrice }) {
    return this.sendToUser(driverId, {
      title: 'Nouvelle demande de course',
      body: `${pickupAddress} - Est. ${estimatedPrice}€`,
      data: { type: 'NEW_RIDE_REQUEST', rideId }
    })
  }

  static async notifyPromotion (userId, { code, discount, expiryDate }) {
    return this.sendToUser(userId, {
      title: '🎁 Offre spéciale !',
      body: `Code ${code}: -${discount}% jusqu'au ${expiryDate}`,
      data: { type: 'PROMOTION', code }
    })
  }
}

module.exports = PushNotificationService
