const crypto = require('crypto')
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    setex: async () => {},
    get: async () => null,
    del: async () => 0
  }
}

/**
 * CSRF Protection Middleware
 */
class CSRFMiddleware {
  constructor () {
    this.CSRF_PREFIX = 'csrf:'
    this.CSRF_EXPIRY = 24 * 60 * 60 // 24 hours
  }

  /**
   * Generate CSRF token
   */
  async generateToken (sessionId) {
    const token = crypto.randomBytes(32).toString('hex')
    const key = `${this.CSRF_PREFIX}${sessionId}`

    await redis.setex(key, this.CSRF_EXPIRY, token)

    return token
  }

  /**
   * Verify CSRF token
   */
  async verifyToken (sessionId, token) {
    const key = `${this.CSRF_PREFIX}${sessionId}`
    const storedToken = await redis.get(key)

    if (!storedToken) {
      return false
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedToken, 'hex'),
      Buffer.from(token, 'hex')
    )
  }

  /**
   * CSRF protection middleware
   */
  protect () {
    return async (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
      }

      const sessionId = req.session?.id || req.userId
      const csrfToken = req.headers['x-csrf-token'] || req.body._csrf

      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Session required',
          error: 'SESSION_REQUIRED'
        })
      }

      if (!csrfToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF token required',
          error: 'CSRF_TOKEN_REQUIRED'
        })
      }

      const isValid = await this.verifyToken(sessionId, csrfToken)

      if (!isValid) {
        return res.status(403).json({
          success: false,
          message: 'Invalid CSRF token',
          error: 'INVALID_CSRF_TOKEN'
        })
      }

      next()
    }
  }

  /**
   * Add CSRF token to response
   */
  addTokenToResponse () {
    return async (req, res, next) => {
      const sessionId = req.session?.id || req.userId

      if (sessionId) {
        const token = await this.generateToken(sessionId)
        res.setHeader('X-CSRF-Token', token)
        res.locals.csrfToken = token
      }

      next()
    }
  }

  /**
   * Revoke CSRF token
   */
  async revokeToken (sessionId) {
    const key = `${this.CSRF_PREFIX}${sessionId}`
    await redis.del(key)
  }
}

module.exports = new CSRFMiddleware()
