const crypto = require('crypto')
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  const map = new Map()
  redis = {
    async setex(key, expiry, value) {
      map.set(key, {value, expires: Date.now() + (expiry * 1000)})
    },
    async get(key) {
      const entry = map.get(key)
      if (!entry) return null
      // optional expiry check
      if (Date.now() > entry.expires) {
        map.delete(key)
        return null
      }
      return entry.value
    },
    async del(key) {
      return map.delete(key) ? 1 : 0
    }
  }
}
const { sendSMS } = require('./smsService')
const { sendEmail } = require('./emailService')

/**
 * OTP Service for phone and email verification
 */
class OTPService {
  constructor () {
    this.OTP_PREFIX = 'otp:'
    this.OTP_EXPIRY = 10 * 60 // 10 minutes
    this.OTP_LENGTH = 6
    this.MAX_ATTEMPTS = 5
    this.ATTEMPT_PREFIX = 'otp:attempts:'
  }

  /**
   * Generate OTP code
   */
  generateOTP () {
    return crypto.randomInt(100000, 999999).toString()
  }

  /**
   * Generate and store OTP for phone verification
   */
  async generatePhoneOTP (phoneNumber) {
    const otp = this.generateOTP()
    const key = `${this.OTP_PREFIX}phone:${phoneNumber}`

    // Store OTP in Redis
    await redis.setex(key, this.OTP_EXPIRY, otp)

    // Reset attempts
    await this.resetAttempts(phoneNumber)

    // Send SMS
    try {
      await sendSMS(phoneNumber, `Your TaxiLibre verification code is: ${otp}. Valid for 10 minutes.`)
      return { success: true, message: 'OTP sent successfully' }
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`)
    }
  }

  /**
   * Generate and store OTP for email verification
   */
  async generateEmailOTP (email) {
    const otp = this.generateOTP()
    const key = `${this.OTP_PREFIX}email:${email}`

    // Store OTP in Redis
    await redis.setex(key, this.OTP_EXPIRY, otp)

    // Reset attempts
    await this.resetAttempts(email)

    // Send email
    try {
      await sendEmail(email, 'TaxiLibre Verification Code', `Your verification code is: ${otp}. Valid for 10 minutes.`)
      return { success: true, message: 'OTP sent successfully' }
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  /**
   * Verify phone OTP
   */
  async verifyPhoneOTP (phoneNumber, code) {
    const key = `${this.OTP_PREFIX}phone:${phoneNumber}`

    // Check attempts
    const attempts = await this.getAttempts(phoneNumber)
    if (attempts >= this.MAX_ATTEMPTS) {
      throw new Error('Maximum verification attempts exceeded')
    }

    // Get stored OTP
    const storedOTP = await redis.get(key)

    if (!storedOTP) {
      throw new Error('OTP expired or not found')
    }

    // Verify OTP
    if (storedOTP !== code) {
      await this.incrementAttempts(phoneNumber)
      throw new Error('Invalid OTP')
    }

    // Delete OTP after successful verification
    await redis.del(key)
    await this.resetAttempts(phoneNumber)

    return { success: true, message: 'Phone verified successfully' }
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOTP (email, code) {
    const key = `${this.OTP_PREFIX}email:${email}`

    // Check attempts
    const attempts = await this.getAttempts(email)
    if (attempts >= this.MAX_ATTEMPTS) {
      throw new Error('Maximum verification attempts exceeded')
    }

    // Get stored OTP
    const storedOTP = await redis.get(key)

    if (!storedOTP) {
      throw new Error('OTP expired or not found')
    }

    // Verify OTP
    if (storedOTP !== code) {
      await this.incrementAttempts(email)
      throw new Error('Invalid OTP')
    }

    // Delete OTP after successful verification
    await redis.del(key)
    await this.resetAttempts(email)

    return { success: true, message: 'Email verified successfully' }
  }

  /**
   * Get verification attempts
   */
  async getAttempts (identifier) {
    const key = `${this.ATTEMPT_PREFIX}${identifier}`
    const attempts = await redis.get(key)
    return parseInt(attempts) || 0
  }

  /**
   * Increment verification attempts
   */
  async incrementAttempts (identifier) {
    const key = `${this.ATTEMPT_PREFIX}${identifier}`
    const attempts = await this.getAttempts(identifier)
    await redis.setex(key, this.OTP_EXPIRY, (attempts + 1).toString())
  }

  /**
   * Reset verification attempts
   */
  async resetAttempts (identifier) {
    const key = `${this.ATTEMPT_PREFIX}${identifier}`
    await redis.del(key)
  }

  /**
   * Resend OTP
   */
  async resendPhoneOTP (phoneNumber) {
    // Check if user has exceeded resend limit
    const resendKey = `otp:resend:${phoneNumber}`
    const resendCount = await redis.get(resendKey)

    if (resendCount && parseInt(resendCount) >= 3) {
      throw new Error('Maximum resend attempts exceeded. Please try again later.')
    }

    // Generate new OTP
    await this.generatePhoneOTP(phoneNumber)

    // Update resend count
    const newCount = (parseInt(resendCount) || 0) + 1
    await redis.setex(resendKey, 60 * 60, newCount.toString()) // 1 hour

    return { success: true, message: 'OTP resent successfully' }
  }

  /**
   * Check if OTP is valid (without consuming it)
   */
  async checkOTP (identifier, code, type = 'phone') {
    const key = `${this.OTP_PREFIX}${type}:${identifier}`
    const storedOTP = await redis.get(key)
    return storedOTP === code
  }
}

module.exports = new OTPService()
