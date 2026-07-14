const { logger } = require('./loggingService')
const emailService = require('./emailService')
const smsService = require('./smsService')
const pushNotificationService = require('./pushNotificationService')
const { AuditLog } = require('../models')

class NotificationService {
  async sendNotification({ userId, type, title, message, data = {}, channels = ['push'] }) {
    const results = { success: true, channels: {}, errors: [] }
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'push':
            results.channels.push = await pushNotificationService.sendToUser(userId, { title, body: message, data })
            break
          case 'email':
            results.channels.email = await emailService.sendEmail({ userId, subject: title, text: message })
            break
          case 'sms':
            results.channels.sms = await smsService.sendSMS({ userId, body: message })
            break
          default:
            results.errors.push({ channel, error: 'Unsupported channel' })
        }
      } catch (error) {
        results.errors.push({ channel, error: error.message })
        logger.error('Notification failed', { userId, channel, error: error.message })
      }
    }
    if (results.errors.length > 0) results.success = results.errors.length < channels.length
    await AuditLog.create({ action: 'notification_sent', userId, details: { type, channels, success: results.success } }).catch(() => {})
    return results
  }
  async notifyRideRequest({ driverId, ride }) {
    return this.sendNotification({ userId: driverId, type: 'ride_request', title: 'Nouvelle course', message: `Course de ${ride.pickupAddress} a ${ride.dropoffAddress}`, data: { rideId: ride.id }, channels: ['push', 'sms'] })
  }
  async notifyRideAccepted({ passengerId, ride, driver }) {
    return this.sendNotification({ userId: passengerId, type: 'ride_accepted', title: 'Chauffeur trouve', message: `${driver.name} arrive dans ${ride.eta} min`, data: { rideId: ride.id }, channels: ['push'] })
  }
  async notifyRideCompleted({ passengerId, ride }) {
    return this.sendNotification({ userId: passengerId, type: 'ride_completed', title: 'Course terminee', message: `Votre course de ${ride.finalPrice}€ est terminee`, data: { rideId: ride.id }, channels: ['push', 'email'] })
  }
  async notifyPaymentReceived({ driverId, amount }) {
    return this.sendNotification({ userId: driverId, type: 'payment_received', title: 'Paiement recu', message: `Vous avez recu ${amount}€`, channels: ['push', 'email'] })
  }
  async sendBulkNotification({ userIds, title, message, channels = ['push'] }) {
    const results = { successCount: 0, failureCount: 0, total: userIds.length }
    for (const userId of userIds) {
      try {
        await this.sendNotification({ userId, type: 'bulk', title, message, channels })
        results.successCount++
      } catch (error) { results.failureCount++ }
    }
    return results
  }
}
module.exports = new NotificationService()
