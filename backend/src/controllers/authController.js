'use strict';

const { User, Profile, Driver, Sequelize } = require('../models')
const jwtService = require('../services/jwtService')
const otpService = require('../services/otpService')
const emailService = require('../services/emailService')
const auditLogService = require('../services/auditLogService')
const oauth2Service = require('../services/oauth2Service')
const { sendSuccess } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError

// ─── Helpers ──────────────────────────────────────────────────────────────────
const logAuth = async (action, data = {}) => {
  try {
    await auditLogService.logAuthEvent({ action, success: true, ...data })
  } catch {
    // Ne jamais bloquer le flux principal si l'audit échoue
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role = 'passenger' } = req.body

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400, 'MISSING_FIELDS')
    }

    if (role === 'admin' && email !== 'fh.lebazar@gmail.com') {
      throw new AppError('Admin registration is forbidden', 403, 'ADMIN_REGISTRATION_FORBIDDEN')
    }

    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS')
    }

    // Décomposer name en firstName/lastName
    const nameParts = (name || '').trim().split(' ')
    const firstName = nameParts[0] || name
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''

    // Create User (without profile fields)
    const user = await User.create({
      email,
      password,
      role
    })

    // Create Profile
    await Profile.create({
      userId: user.id,
      firstName,
      lastName,
      phone: phone || null,
      language: 'fr',
      currency: 'EUR'
    })

    // Create Driver profile if role is driver
    if (role === 'driver') {
      try {
        await Driver.create({
          userId: user.id,
          status: 'OFFLINE',
          isVerified: false,
          walletBalance: 0,
          payoutMethod: 'WEEKLY'
          // other fields have defaults
        })
      } catch (driverErr) {
        // Ne pas bloquer si la création du profil driver échoue
        console.warn('[Auth] Driver profile creation failed:', driverErr.message)
      }
    }

    const tokens = await jwtService.generateTokenPair(user)

    // Fetch user with profile for response
    const userWithProfile = await User.findByPk(user.id, {
      include: [{
        model: Profile,
        as: 'profile'
      }]
    })

    sendSuccess(res, { user: userWithProfile.toJSON(), tokens }, 'User registered successfully', 201)
  } catch (error) {
    next(error)
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS')
    }

    const user = await User.findOne({ where: { email } })
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Update lastLoginAt (column may not exist; we can ignore)
    try {
      await user.update({ lastLoginAt: new Date() })
    } catch {
      // colonne peut ne pas exister encore
    }

    const tokens = await jwtService.generateTokenPair(user)

    await logAuth('login', {
      userId: user.id,
      method: 'email',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    // Fetch user with profile and driver if applicable
    const userWithProfile = await User.findByPk(user.id, {
      include: [
        { model: Profile, as: 'profile' },
        { model: Driver, as: 'driver', required: false }
      ]
    })

    sendSuccess(res, { user: userWithProfile.toJSON(), tokens }, 'Login successful')
  } catch (error) {
    next(error)
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token, deviceId } = req.body

    if (!token) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN')
    }

    const tokens = await jwtService.refreshAccessToken(token, deviceId)

    sendSuccess(res, { tokens }, 'Token refreshed successfully')
  } catch (error) {
    next(error)
  }
}

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const userWithProfile = await User.findByPk(req.userId, {
      include: [
        { model: Profile, as: 'profile' },
        { model: Driver, as: 'driver', required: false }
      ]
    })

    if (!userWithProfile) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    sendSuccess(res, { user: userWithProfile.toJSON() }, 'Profile retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, language, currency } = req.body
    const userId = req.userId

    const profile = await Profile.findOne({ where: { userId } })
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    const updateData = {}

    if (name) {
      const parts = name.trim().split(' ')
      updateData.firstName = parts[0]
      updateData.lastName = parts.slice(1).join(' ') || parts[0]
    }
    if (phone !== undefined) updateData.phone = phone
    if (avatar !== undefined) updateData.avatarUrl = avatar // assuming avatar is URL
    if (language !== undefined) updateData.language = language
    if (currency !== undefined) updateData.currency = currency

    await profile.update(updateData)

    const userWithProfile = await User.findByPk(userId, {
      include: [{ model: Profile, as: 'profile' }]
    })

    sendSuccess(res, { user: userWithProfile.toJSON() }, 'Profile updated successfully')
  } catch (error) {
    next(error)
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body

    if (!token) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN')
    }

    try {
      await jwtService.revokeRefreshToken(token)
    } catch {
      // Token déjà révoqué ou invalide
    }

    await logAuth('logout', {
      userId: req.userId || null,
      method: 'token',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Logout successful')
  } catch (error) {
    next(error)
  }
}

// ─── Logout All ───────────────────────────────────────────────────────────────
const logoutAll = async (req, res, next) => {
  try {
    const userId = req.userId

    try {
      await jwtService.revokeAllUserTokens(userId)
    } catch {
      // Tokens déjà révoqués
    }

    await logAuth('logout_all', {
      userId,
      method: 'token',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Logged out from all devices successfully')
  } catch (error) {
    next(error)
  }
}

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.userId

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400, 'MISSING_PASSWORDS')
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400, 'PASSWORD_TOO_SHORT')
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD')
    }

    await user.update({ password: newPassword })

    await logAuth('password_changed', {
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

// ─── Request Password Reset ───────────────────────────────────────────────────
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body

    const MSG = 'If your email is registered, you will receive a reset link'

    const user = await User.findOne({ where: { email } })
    if (!user) {
      return sendSuccess(res, null, MSG)
    }

    const resetToken = user.generatePasswordResetToken()
    await user.save()

    try {
      await emailService.sendPasswordReset(email, resetToken)
    } catch (emailErr) {
      console.warn('[Auth] Email reset send failed:', emailErr.message)
    }

    await logAuth('password_reset_requested', {
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, MSG)
  } catch (error) {
    next(error)
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      throw new AppError('Token and new password are required', 400, 'MISSING_FIELDS')
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Sequelize.Op.gt]: new Date() }
      }
    })

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN')
    }

    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    await logAuth('password_reset', {
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, 'Password has been reset')
  } catch (error) {
    next(error)
  }
}

// ─── OAuth ────────────────────────────────────────────────────────────────────
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

const oauthCallback = async (req, res, next) => {
  try {
    const { provider } = req.params
    const { code, error } = req.query

    if (error) throw new AppError(`OAuth error: ${error}`, 400, 'OASSERT_ERROR')
    if (!code) throw new AppError('Authorization code not provided', 400, 'MISSING_CODE')

    const tokenData = await oauth2Service.exchangeCodeForToken(provider, code)
    const userInfo = await oauth2Service.getUserInfo(provider, tokenData.access_token)
    const user = await oauth2Service.findOrCreateUser(userInfo, 'passenger')
    const tokens = await jwtService.generateTokenPair(user)

    await logAuth('oauth_login', {
      userId: user.id,
      provider,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(
      `${frontendUrl}/auth/oauth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`
    )
  } catch (error) {
    next(error)
  }
}

// ─── OTP Phone ────────────────────────────────────────────────────────────────
const sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone } = req.body
    const result = await otpService.generatePhoneOTP(phone)

    await logAuth('otp_sent', {
      method: 'phone',
      identifier: phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

const verifyPhoneOTP = async (req, res, next) => {
  try {
    const { phone, code } = req.body
    const result = await otpService.verifyPhoneOTP(phone, code)

    // Update profile phoneVerifiedAt? We'll add field later if needed
    // For now update User.phone? but phone is in Profile
    await Profile.update({ phoneVerifiedAt: new Date() }, { where: { phone } })

    await logAuth('phone_verified', {
      identifier: phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
const sendEmailOTP = async (req, res, next) => {
  try {
    const { email } = req.body
    const result = await otpService.generateEmailOTP(email)

    await logAuth('otp_sent', {
      method: 'email',
      identifier: email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

const verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, code } = req.body
    const result = await otpService.verifyEmailOTP(email, code)

    await User.update({ emailVerifiedAt: new Date() }, { where: { email } })

    await logAuth('email_verified', {
      identifier: email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    sendSuccess(res, null, result.message)
  } catch (error) {
    next(error)
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
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