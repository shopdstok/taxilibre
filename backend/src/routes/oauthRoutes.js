const express = require('express')
const router = express.Router()
const oauth2Service = require('../services/oauth2Service')
const jwtService = require('../services/jwtService')
const { successResponse, errorResponse, AppError } = require('../middleware/errorMiddleware')
const auditLogService = require('../services/auditLogService')

/**
 * Get OAuth authorization URL
 */
router.get('/authorize/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params
    const state = req.query.state || null

    const authUrl = oauth2Service.getAuthUrl(provider, state)

    res.json(successResponse({
      authUrl,
      provider
    }, 'Authorization URL generated'))
  } catch (error) {
    next(error)
  }
})

/**
 * OAuth callback handler
 */
router.post('/callback/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params
    const { code, state } = req.body

    if (!code) {
      throw new AppError('Authorization code is required', 400, 'MISSING_CODE')
    }

    // Exchange code for access token
    const tokenData = await oauth2Service.exchangeCodeForToken(provider, code)

    // Get user info from provider
    const userInfo = await oauth2Service.getUserInfo(provider, tokenData.access_token)

    // Find or create user
    const user = await oauth2Service.findOrCreateUser(userInfo, req.body.role || 'passenger')

    // Generate tokens
    const tokens = await jwtService.generateTokenPair(user)

    // Log the OAuth login event
    await auditLogService.logAuthEvent({
      action: 'oauth_login',
      userId: user.id,
      method: provider,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json(successResponse({
      user: user.toJSON(),
      tokens,
      provider
    }, 'OAuth authentication successful'))
  } catch (error) {
    // Log failed OAuth attempt
    await auditLogService.logAuthEvent({
      action: 'oauth_login_failed',
      method: req.params.provider,
      success: false,
      failureReason: error.message,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    next(error)
  }
})

/**
 * Apple Sign-In (special case with ID token)
 */
router.post('/apple', async (req, res, next) => {
  try {
    const { idToken, role = 'passenger' } = req.body

    if (!idToken) {
      throw new AppError('Apple ID token is required', 400, 'MISSING_TOKEN')
    }

    // Verify Apple ID token
    const payload = await oauth2Service.verifyAppleToken(idToken)

    // Normalize user info
    const userInfo = {
      email: payload.email,
      name: null, // Apple doesn't provide name in ID token
      firstName: null,
      lastName: null,
      picture: null,
      provider: 'apple',
      providerId: payload.sub
    }

    // Find or create user
    const user = await oauth2Service.findOrCreateUser(userInfo, role)

    // Generate tokens
    const tokens = await jwtService.generateTokenPair(user)

    // Log the Apple login event
    await auditLogService.logAuthEvent({
      action: 'oauth_login',
      userId: user.id,
      method: 'apple',
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json(successResponse({
      user: user.toJSON(),
      tokens,
      provider: 'apple'
    }, 'Apple authentication successful'))
  } catch (error) {
    next(error)
  }
})

/**
 * Link OAuth account to existing user
 */
router.post('/link/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params
    const { code } = req.body
    const userId = req.userId

    if (!code) {
      throw new AppError('Authorization code is required', 400, 'MISSING_CODE')
    }

    // Exchange code for access token
    const tokenData = await oauth2Service.exchangeCodeForToken(provider, code)

    // Get user info from provider
    const userInfo = await oauth2Service.getUserInfo(provider, tokenData.access_token)

    // Update user with provider ID
    const { User } = require('../models')
    const user = await User.findByPk(userId)

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    await user.update({
      [`${userInfo.provider}Id`]: userInfo.providerId
    })

    // Log the account linking event
    await auditLogService.logUserEvent({
      adminId: userId,
      action: 'oauth_account_linked',
      entityType: 'user',
      entityId: userId,
      changes: { [`${userInfo.provider}Id`]: userInfo.providerId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json(successResponse({
      user: user.toJSON(),
      provider
    }, 'OAuth account linked successfully'))
  } catch (error) {
    next(error)
  }
})

/**
 * Unlink OAuth account
 */
router.delete('/unlink/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params
    const userId = req.userId

    const { User } = require('../models')
    const user = await User.findByPk(userId)

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    // Check if user has password (required if unlinking all OAuth)
    const hasPassword = !!user.password && user.password.length > 20

    const providerField = `${provider}Id`
    if (!user[providerField]) {
      throw new AppError('OAuth account not linked', 400, 'NOT_LINKED')
    }

    await user.update({
      [providerField]: null
    })

    // Log the account unlinking event
    await auditLogService.logUserEvent({
      adminId: userId,
      action: 'oauth_account_unlinked',
      entityType: 'user',
      entityId: userId,
      changes: { [providerField]: null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json(successResponse({
      user: user.toJSON(),
      provider
    }, 'OAuth account unlinked successfully'))
  } catch (error) {
    next(error)
  }
})

module.exports = router
