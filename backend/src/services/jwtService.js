const jwt = require('jsonwebtoken')
const crypto = require('crypto')
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null,
    setex: async () => {}
  }
}
const refreshTokenService = require('./refreshTokenService');
const { logger } = require('../services/loggingService')

/**
 * Enhanced JWT Service with token rotation and blacklist
 */
class JWTService {
  constructor () {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production'
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    this.BLACKLIST_PREFIX = 'jwt:blacklist:'
    logger.info('JWTService created with secret:', this.JWT_SECRET.substring(0, 10) + '...') // Log first 10 chars
  }

  /**
   * Generate access token
   */
  generateAccessToken (payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
        jti: crypto.randomUUID() // JWT ID for tracking
      },
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_EXPIRES_IN,
        issuer: 'taxilibre',
        audience: 'taxilibre-users'
      }
    )
  }

  /**
   * Generate token pair with refresh token rotation (using database for refresh tokens)
   */
  async generateTokenPair (user, deviceId = null) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      deviceId
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = await refreshTokenService.generateRefreshToken(user.id)

    return {
      accessToken,
      refreshToken,
      expiresIn: this.JWT_EXPIRES_IN
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken (token) {
    try {
      logger.debug('JWTService.verifyAccessToken using secret:', this.JWT_SECRET.substring(0, 10) + '...')
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'taxilibre',
        audience: 'taxilibre-users'
      })

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti)
      if (isBlacklisted) {
        throw new Error('Token has been revoked')
      }

      return decoded
    } catch (error) {
      logger.error('JWTService.verifyAccessToken error:', error.message)
      throw new Error('Invalid access token')
    }
  }

  /**
   * Verify refresh token (database-backed)
   */
  async verifyRefreshToken (token) {
    // This will throw if invalid or expired
    const userId = await refreshTokenService.verifyRefreshToken(token)
    return { id: userId } // Return object compatible with existing code
  }

  /**
   * Revoke access token (blacklist)
   */
  async revokeAccessToken (jti, expiresIn) {
    const key = `${this.BLACKLIST_PREFIX}${jti}`
    await redis.setex(key, expiresIn, 'revoked')
  }

  /**
   * Revoke refresh token (delete from database)
   */
  async revokeRefreshToken (token) {
    await refreshTokenService.revokeRefreshToken(token)
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted (jti) {
    const key = `${this.BLACKLIST_PREFIX}${jti}`
    const result = await redis.get(key)
    return !!result
  }

  /**
   * Revoke all tokens for a user (logout everywhere)
   */
  async revokeAllUserTokens (userId) {
    // Revoke all refresh tokens for user
    await refreshTokenService.revokeAllUserTokens(userId)

    // Note: Access tokens will be blacklisted as they're used
    // or we can store active access token IDs in Redis too
  }

  /**
   * Refresh access token with rotation
   */
  async refreshAccessToken (refreshToken, deviceId = null) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken)

      // Get user from database
      const { User } = require('../models')
      const user = await User.findByPk(decoded.id)

      if (!user || !user.isActive) {
        throw new Error('Invalid user')
      }

      // Revoke the used refresh token (rotation)
      await this.revokeRefreshToken(refreshToken)

      // Generate new token pair
      return await this.generateTokenPair(user, deviceId)
    } catch (error) {
      throw new Error('Token refresh failed')
    }
  }

  /**
   * Extract token from header
   */
  extractTokenFromHeader (authHeader) {
    if (!authHeader) return null

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null

    return parts[1]
  }

  /**
   * Decode token without verification (debug only)
   */
  decodeToken (token) {
    return jwt.decode(token)
  }
}

module.exports = new JWTService()
