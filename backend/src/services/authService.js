const { User, Profile, Driver, RefreshToken } = require('../models')
const jwtService = require('./jwtService')
const otpService = require('./otpService')
const emailService = require('./emailService')
const smsService = require('./smsService')
const { logger } = require('./loggingService')
const crypto = require('crypto')
const speakeasy = require('speakeasy')
const qrcode = require('qrcode')

/**
 * Auth Service - Handles all authentication-related operations
 */
class AuthService {
  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} phone - User's phone number
   * @param {string} password - User's password
   * @param {string} role - User's role (passenger, driver, admin)
   * @returns {Object} Created user and tokens
   */
  async registerUser(email, phone, password, role = 'passenger') {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } })
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      if (phone) {
        const existingPhoneUser = await User.findOne({ where: { phone } })
        if (existingPhoneUser) {
          throw new Error('User with this phone number already exists')
        }
      }

      // Validate role
      const validRoles = ['passenger', 'driver', 'admin']
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role')
      }

      // Hash password
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      // Create user
      const user = await User.create({
        email,
        phone: phone || null,
        passwordHash,
        role,
        isVerified: false,
        isActive: true
      })

      // Create profile
      await Profile.create({
        userId: user.id,
        firstName: '',
        lastName: '',
        language: 'fr',
        currency: 'EUR'
      })

      // Create driver profile if role is driver
      if (role === 'driver') {
        await Driver.create({
          userId: user.id,
          status: 'OFFLINE',
          isVerified: false,
          walletBalance: 0,
          stripeConnectId: null,
          totalEarnings: 0,
          rideCount: 0
        })
      }

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user)

      logger.info('User registered successfully', { userId: user.id, email, role })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        tokens
      }
    } catch (error) {
      logger.error('Error in registerUser', { error, email, phone, role })
      throw error
    }
  }

  /**
   * Login a user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} User and tokens
   */
  async loginUser(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // Find user
      const user = await User.findOne({ where: { email } })
      if (!user) {
        throw new Error('Invalid credentials')
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated')
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        throw new Error('Invalid credentials')
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() })

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user)

      logger.info('User logged in successfully', { userId: user.id, email })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt
        },
        tokens
      }
    } catch (error) {
      logger.error('Error in loginUser', { error, email })
      throw error
    }
  }

  /**
   * Verify email with 6-digit code
   * @param {string} userId - User's ID
   * @param {string} code - 6-digit verification code
   * @returns {Object} Result
   */
  async verifyEmail(userId, code) {
    try {
      // Validate inputs
      if (!userId || !code) {
        throw new Error('User ID and code are required')
      }

      if (!/^\d{6}$/.test(code)) {
        throw new Error('Code must be a 6-digit number')
      }

      // Find user
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check if already verified
      if (user.isVerified) {
        throw new Error('Email already verified')
      }

      // Verify OTP
      const isValid = await otpService.verifyEmailOTP(user.email, code)
      if (!isValid) {
        throw new Error('Invalid or expired verification code')
      }

      // Update user as verified
      await user.update({ isVerified: true })

      logger.info('Email verified successfully', { userId: user.id, email: user.email })

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified
        }
      }
    } catch (error) {
      logger.error('Error in verifyEmail', { error, userId, code })
      throw error
    }
  }

  /**
   * Verify phone with OTP
   * @param {string} userId - User's ID
   * @param {string} otp - 6-digit OTP code
   * @returns {Object} Result
   */
  async verifyPhone(userId, otp) {
    try {
      // Validate inputs
      if (!userId || !otp) {
        throw new Error('User ID and OTP are required')
      }

      if (!/^\d{6}$/.test(otp)) {
        throw new Error('OTP must be a 6-digit number')
      }

      // Find user
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check if user has phone
      if (!user.phone) {
        throw new Error('User has no phone number')
      }

      // Verify OTP
      const isValid = await otpService.verifyPhoneOTP(user.phone, otp)
      if (!isValid) {
        throw new Error('Invalid or expired OTP')
      }

      logger.info('Phone verified successfully', { userId: user.id, phone: user.phone })

      return {
        success: true,
        message: 'Phone verified successfully',
        user: {
          id: user.id,
          phone: user.phone
        }
      }
    } catch (error) {
      logger.error('Error in verifyPhone', { error, userId, otp })
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token pair
   */
  async refreshAccessToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required')
      }

      // Use JWT service to refresh token
      const tokens = await jwtService.refreshAccessToken(refreshToken)

      logger.info('Access token refreshed successfully')

      return tokens
    } catch (error) {
      logger.error('Error in refreshAccessToken', { error })
      throw error
    }
  }

  /**
   * Logout user by invalidating refresh token
   * @param {string} userId - User's ID
   * @param {string} refreshToken - Refresh token to invalidate
   * @returns {Object} Result
   */
  async logout(userId, refreshToken) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        await jwtService.revokeRefreshToken(refreshToken)
      }

      logger.info('User logged out successfully', { userId })

      return {
        success: true,
        message: 'Logged out successfully'
      }
    } catch (error) {
      logger.error('Error in logout', { error, userId })
      throw error
    }
  }

  /**
   * Setup 2FA for user (drivers only)
   * @param {string} userId - User's ID
   * @returns {Object} Secret and QR code
   */
  async setup2FA(userId) {
    try {
      // Validate user exists and is a driver
      const user = await User.findByPk(userId, {
        include: [{ model: Driver, as: 'driver' }]
      })
      if (!user) {
        throw new Error('User not found')
      }

      if (user.role !== 'driver') {
        throw new Error('2FA is only required for drivers')
      }

      // Generate secret
      const secret = speakeasy.generateSecret({ length: 20 })
      
      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url)

      logger.info('2FA setup initiated for user', { userId: user.id })

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url
      }
    } catch (error) {
      logger.error('Error in setup2FA', { error, userId })
      throw error
    }
  }

  /**
   * Verify 2FA token
   * @param {string} userId - User's ID
   * @param {string} token - 6-digit 2FA token
   * @returns {Object} Result
   */
  async verify2FA(userId, token) {
    try {
      // Validate inputs
      if (!userId || !token) {
        throw new Error('User ID and token are required')
      }

      if (!/^\d{6}$/.test(token)) {
        throw new Error('Token must be a 6-digit number')
      }

      // Find user and get secret
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // For now, we'll store secret in user metadata or separate table
      // In a real implementation, we'd have a user_secrets table
      // For this implementation, we'll generate a demo secret
      // In production, this should be stored securely during setup
      const secret = process.env.TWO_FA_SECRET || 'JBSWY3DPEHPK3PXP' // Demo secret
      
      // Verify token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token
      })

      if (!verified) {
        throw new Error('Invalid 2FA token')
      }

      logger.info('2FA verified successfully', { userId: user.id })

      return {
        success: true,
        message: '2FA verified successfully'
      }
    } catch (error) {
      logger.error('Error in verify2FA', { error, userId, token })
      throw error
    }
  }

  /**
   * Request password reset
   * @param {string} email - User's email
   * @returns {Object} Result
   */
  async requestPasswordReset(email) {
    try {
      if (!email) {
        throw new Error('Email is required')
      }

      // Find user
      const user = await User.findOne({ where: { email } })
      if (!user) {
        // Return success anyway to prevent email enumeration
        return {
          success: true,
          message: 'If the email is registered, you will receive a reset link'
        }
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

      // Set reset token and expiry (1 hour)
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

      await user.update({
        resetTokenHash,
        resetExpires
      })

      // Send email
      await emailService.sendPasswordReset(email, resetToken)

      logger.info('Password reset requested', { userId: user.id, email })

      return {
        success: true,
        message: 'If the email is registered, you will receive a reset link'
      }
    } catch (error) {
      logger.error('Error in requestPasswordReset', { error, email })
      throw error
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Object} Result
   */
  async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required')
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Hash token to compare with stored hash
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')

      // Find user with valid token
      const user = await User.findOne({
        where: {
          resetTokenHash: tokenHash,
          resetExpires: {
            [Sequelize.Op.gt]: new Date()
          }
        }
      })

      if (!user) {
        throw new Error('Invalid or expired reset token')
      }

      // Hash new password
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(newPassword, salt)

      // Update password and clear reset token
      await user.update({
        passwordHash,
        resetTokenHash: null,
        resetExpires: null
      })

      logger.info('Password reset successful', { userId: user.id })

      return {
        success: true,
        message: 'Password has been reset successfully'
      }
    } catch (error) {
      logger.error('Error in resetPassword', { error, token })
      throw error
    }
  }
}

module.exports = new AuthService()