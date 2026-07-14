const { sequelize } = require('../config/database')

/**
 * SMS Service for sending text messages via Twilio
 */
class SMSService {
  constructor () {
    this.client = null
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // Only initialize Twilio if Account SID is valid (starts with AC)
      if (process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        this.client = require('twilio')(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        )
      } else {
      }
    } else {
    }
  }

  /**
   * Send SMS to phone number
   */
  async sendSMS (phoneNumber, message) {
    if (!this.client) {
      return { success: true, mock: true }
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      })

      return { success: true, messageId: result.sid }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode (phoneNumber, code) {
    const message = `Your TaxiLibre verification code is: ${code}. Valid for 10 minutes.`
    return this.sendSMS(phoneNumber, message)
  }

  /**
   * Send ride notification SMS
   */
  async sendRideNotification (phoneNumber, driverName, eta) {
    const message = `TaxiLibre: ${driverName} arrive dans ${eta} minutes. Track your ride in the app.`
    return this.sendSMS(phoneNumber, message)
  }
}

// Export singleton
module.exports = new SMSService()
