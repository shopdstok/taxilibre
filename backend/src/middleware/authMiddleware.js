const jwtService = require('../services/jwtService')
const { User, Driver } = require('../models')
const { logger } = require('../services/loggingService')

/**
 * Authentication middleware for protecting routes
 */
/**
 * Authentication middleware for protecting routes
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization
    logger.debug('Auth middleware: authHeader:', authHeader)
    const token = jwtService.extractTokenFromHeader(authHeader)
    logger.debug('Auth middleware: extracted token:', token ? 'present' : 'null')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      })
    }

    // Verify token
    const decoded = await jwtService.verifyAccessToken(token)
    logger.debug('Auth middleware: decoded token:', decoded)

    // Find user in database
    let user = await User.findByPk(decoded.id)
    logger.debug('Auth middleware: decoded id:', decoded.id, 'user found:', user ? user.id : 'null')
    if (user) {
      logger.debug('Auth middleware: user.isActive:', user.isActive)
    }

    // If user is a driver, get driver info too
    if (user && user.role === 'driver') {
      user = await User.findByPk(decoded.id, {
        include: [
          {
            model: Driver,
            as: 'driver',
            required: false
          }
        ]
      })
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user',
        error: 'INVALID_USER'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user',
        error: 'INACTIVE_USER'
      })
    }

    // Add user info to request object
    Object.assign(req, {
      user: user,
      userId: user.id,
      userRole: user.role
    })

    // Add driver info if applicable
    if (user.driver) {
      Object.assign(req, {
        driver: user.driver,
        driverId: user.driver.id
      })
    }

    next()
  } catch (error) {
    logger.error('Auth middleware: error:', error.message)
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    })
  }
}
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTH_REQUIRED'
      })
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles
      })
    }

    next()
  }
}

/**
 * Driver-specific middleware
 */
const requireDriver = (req, res, next) => {
  if (!req.user || req.userRole !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Driver access required',
      error: 'DRIVER_REQUIRED'
    })
  }

  if (!req.driver) {
    return res.status(403).json({
      success: false,
      message: 'Driver profile required',
      error: 'DRIVER_PROFILE_REQUIRED'
    })
  }

  // Check if driver is verified
  if (req.driver.verificationStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Driver verification required',
      error: 'DRIVER_VERIFICATION_REQUIRED'
    })
  }

  next()
}

/**
 * Passenger-specific middleware
 */
const requirePassenger = (req, res, next) => {
  if (!req.user || req.userRole !== 'passenger') {
    return res.status(403).json({
      success: false,
      message: 'Passenger access required',
      error: 'PASSENGER_REQUIRED'
    })
  }

  next()
}

/**
 * Admin-specific middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_REQUIRED'
    })
  }

  next()
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = jwtService.extractTokenFromHeader(req.headers.authorization)

    if (token) {
      const decoded = await jwtService.verifyAccessToken(token)
      const user = await User.findByPk(decoded.id)

      if (user && user.isActive) {
        req.user = user
        req.userId = user.id
        req.userRole = user.role

        // Add driver info if applicable
        if (user.role === 'driver') {
          req.driver = await Driver.findOne({
            where: { userId: user.id }
          })
        }
      }
    }

    next()
  } catch (error) {
    next()
  }
}

/**
 * Check if user owns the resource
 */
const requireOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTH_REQUIRED'
      })
    }

    // For routes with resourceId parameter
    const resourceUserId = req.params[resourceField] || req.body[resourceField]

    if (resourceUserId && req.userId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this resource',
        error: 'ACCESS_DENIED'
      })
    }

    next()
  }
}

/**
 * Rate limiting middleware for specific endpoints
 */
const createRateLimit = (windowMs, max, message) => {
  const requests = new Map()

  return (req, res, next) => {
    const key = req.ip + ':' + req.path
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old requests
    for (const [requestKey, requestTime] of requests.entries()) {
      if (requestTime < windowStart) {
        requests.delete(requestKey)
      }
    }

    // Check current requests
    const userRequests = requests.get(key) || []
    const recentRequests = userRequests.filter(time => time > windowStart)

    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: new Date(now + windowMs).toISOString()
      })
    }

    // Add current request
    recentRequests.push(now)
    requests.set(key, recentRequests)

    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorize: authorizeRoles, // Alias for convenience
  requireDriver,
  requirePassenger,
  requireAdmin,
  optionalAuth,
  requireOwnership,
  createRateLimit
}
