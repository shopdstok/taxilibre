'use strict'

const crypto = require('crypto')
const { logger } = require('./loggingService')

/**
 * RefreshTokenService - Stockage en mémoire (fallback si table absente)
 * Pour production complète, utiliser la table refresh_tokens en DB
 */

// Store en mémoire comme fallback
const tokenStore = new Map()

const generateRefreshToken = async (userId) => {
  try {
    // Essayer d'abord avec la DB
    const { RefreshToken } = require('../models')

    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

    await RefreshToken.create({
      userId,
      token,
      expiresAt,
      isRevoked: false
    })

    return token
  } catch (err) {
    // Fallback : stockage en mémoire
    logger.warn('[RefreshToken] DB unavailable, using memory store:', err.message)

    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

    tokenStore.set(token, { userId, expiresAt })

    return token
  }
}

const verifyRefreshToken = async (token) => {
  try {
    // Essayer d'abord avec la DB
    const { RefreshToken } = require('../models')

    const refreshToken = await RefreshToken.findOne({
      where: { token, isRevoked: false }
    })

    if (!refreshToken) {
      // Fallback mémoire
      const stored = tokenStore.get(token)
      if (!stored || stored.expiresAt < Date.now()) {
        throw new Error('Invalid or expired refresh token')
      }
      return stored.userId
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new Error('Refresh token expired')
    }

    return refreshToken.userId
  } catch (err) {
    if (err.message === 'Invalid or expired refresh token' ||
        err.message === 'Refresh token expired') {
      throw err
    }

    // Fallback mémoire
    const stored = tokenStore.get(token)
    if (!stored || stored.expiresAt < Date.now()) {
      throw new Error('Invalid or expired refresh token')
    }
    return stored.userId
  }
}

const revokeRefreshToken = async (token) => {
  try {
    const { RefreshToken } = require('../models')
    await RefreshToken.update(
      { isRevoked: true },
      { where: { token } }
    )
  } catch {
    tokenStore.delete(token)
  }
}

const revokeAllUserTokens = async (userId) => {
  try {
    const { RefreshToken } = require('../models')
    await RefreshToken.update(
      { isRevoked: true },
      { where: { userId } }
    )
  } catch {
    for (const [token, data] of tokenStore.entries()) {
      if (data.userId === userId) tokenStore.delete(token)
    }
  }
}

module.exports = {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
}
