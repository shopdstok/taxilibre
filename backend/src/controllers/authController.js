const { User, Driver, Sequelize } = require('../models')
const jwtService = require('../services/jwtService')
const otpService = require('../services/otpService')
const emailService = require('../services/emailService')
const auditLogService = require('../services/auditLogService')
const oauth2Service = require('../services/oauth2Service')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role = 'passenger' } = req.body

    // Validate input
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400, 'MISSING_FIELDS')
    }

    // 🚫 INTERDIRE L'INSCRIPTION ADMIN SAUF POUR fh.lebazar@gmail.com
    if (role === 'admin' && email !== 'fh.lebazar@gmail.com') {
      throw new AppError('Admin registration is forbidden', 403, 'ADMIN_REGISTRATION_FORBIDDEN')
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS')
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role
    })

    // Generate tokens
    const tokens = await jwtService.generateTokenPair(user)

    // Create driver profile if role is driver
    if (role === 'driver') {
      await Driver.create({
        userId: user.id,
        status: 'offline',
        verificationStatus: 'pending'
      })
    }

    sendSuccess(res, {
      user: user.toJSON(),
      tokens
    }, 'User registered successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS')
    }

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{ model: Driver, as: 'driver' }]
    })

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Check password - validate for ALL users including admin
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Admin access allowed for all admin users
    // Note: Only restrict in production if needed

    // Update last login
    await user.update({ lastLoginAt: new Date() })

    // Generate tokens
    const tokens = await jwtService.generateTokenPair(user)

    sendSuccess(res, {
      user: user.toJSON(),
      tokens
    }, 'Login successful')
  } catch (error) {
    next(error)
  }
}

/**
 * Refresh access token with rotation
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken, deviceId } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN')
    }

    // Refresh token with rotation
    const tokens = await jwtService.refreshAccessToken(refreshToken, deviceId)

    sendSuccess(res, {
      tokens
    }, 'Token refreshed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: req.userRole === 'driver' ? [{ model: Driver, as: 'driver' }] : []
    })

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    sendSuccess(res, {
      user: user.toJSON()
    }, 'Profile retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body
    const userId = req.userId

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Update user
    const updatedUser = await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      avatar: avatar || user.avatar
    })

    sendSuccess(res, {
      user: updatedUser.toJSON()
    }, 'Profile updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Logout user (revoke current session)
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN')
    }

    // Revoke the refresh token
    await jwtService.revokeRefreshToken(refreshToken)

    // Log logout event
    await auditLogService.logAuthEvent({
      action: 'logout',
      userId: req.userId ? req.userId : null,
      method: 'token',
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Logout successful')
  } catch (error) {
    next(error)
  }
}

/**
 * Logout from all devices
 */
const logoutAll = async (req, res, next) => {
  try {
    const userId = req.userId

    // Revoke all refresh tokens for user
    await jwtService.revokeAllUserTokens(userId)

    // Log logout all event
    await auditLogService.logAuthEvent({
      action: 'logout_all',
      userId,
      method: 'token',
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Logged out from all devices successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.userId

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400, 'MISSING_PASSWORDS')
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD')
    }

    // Update password
    await user.update({ password: newPassword })

    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user) {
      // Don't reveal whether email exists for security
      return sendSuccess(res, null, 'If your email is registered, you will receive a reset link')
    }

    const resetToken = user.generatePasswordResetToken()
    await user.save()

    // Send reset email
    await emailService.sendPasswordReset(email, resetToken)

    // Log password reset request
    await auditLogService.logAuthEvent({
      action: 'password_reset_requested',
      userId: user.id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'If your email is registered, you will receive a reset link')
  } catch (error) {
    next(error)
  }
}

/**
 * Reset password with token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [Sequelize.Op.gt]: new Date()
        }
      }
    })

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN')
    }

    // Update password and clear reset token
    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    // Log password reset
    await auditLogService.logAuthEvent({
      action: 'password_reset',
      userId: user.id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Password has been reset')
  } catch (error) {
    next(error)
  }
}

/**
 * OAuth redirect
 */
const oauthRedirect = async (req, res, next) => {
  try {
    const { provider } = req.params
    const state = req.query.state || null

    const authUrl = oauth2Service.getAuthUrl(provider, state)
    res.redirect(authUrl)
  } catch (error) {
    next(error)
  }
}

/**
 * OAuth callback
 */
const oauthCallback = async (req, res, next) => {
  try {
    const { provider } = req.params
    const { code, state, error } = req.query

    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }

    if (!code) {
      throw new AppError('Authorization code not provided', 400, 'MISSING_CODE')
    }

    // Exchange code for token
    const tokenData = await oauth2Service.exchangeCodeForToken(provider, code)

    // Get user info from provider
    const userInfo = await oauth2Service.getUserInfo(provider, tokenData.access_token)

    // Find or create user
    const user = await oauth2Service.findOrCreateUser(userInfo, 'passenger')

    // Generate tokens
    const tokens = await jwtService.generateTokenPair(user)

    // Log OAuth login
    await auditLogService.logAuthEvent({
      action: 'oauth_login',
      userId: user.id,
      provider,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/auth/oauth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`)
  } catch (error) {
    next(error)
  }
}

/**
 * Send phone OTP for verification
 */
const sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone } = req.body

    const result = await otpService.generatePhoneOTP(phone)

    // Log OTP sent event
    await auditLogService.logAuthEvent({
      action: 'otp_sent',
      method: 'phone',
      identifier: phone,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * Verify phone OTP
 */
const verifyPhoneOTP = async (req, res, next) => {
  try {
    const { phone, code } = req.body

    const result = await otpService.verifyPhoneOTP(phone, code)

    // Mark phone as verified in database
    await User.update(
      { phoneVerifiedAt: new Date() },
      { where: { phone } }
    )

    // Log verification success
    await auditLogService.logAuthEvent({
      action: 'phone_verified',
      identifier: phone,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * Send email OTP for verification
 */
const sendEmailOTP = async (req, res, next) => {
  try {
    const { email } = req.body

    const result = await otpService.generateEmailOTP(email)

    // Log OTP sent event
    await auditLogService.logAuthEvent({
      action: 'otp_sent',
      method: 'email',
      identifier: email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * Verify email OTP
 */
const verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, code } = req.body

    const result = await otpService.verifyEmailOTP(email, code)

    // Mark email as verified in database
    await User.update(
      { emailVerifiedAt: new Date() },
      { where: { email } }
    )

    // Log verification success
    await auditLogService.logAuthEvent({
      action: 'email_verified',
      identifier: email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
  logoutAll,
  changePassword,
  requestPasswordReset,
  resetPassword,
  sendPhoneOTP,
  verifyPhoneOTP,
  sendEmailOTP,
  verifyEmailOTP,
  oauthRedirect,
  oauthCallback
}
