/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString()

  res.on('finish', () => {
  })

  next()
}

/**
 * Validate JWT middleware
 */
const validateJWT = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  try {
    const { verifyToken } = require('../config/jwt')
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      })
    }

    next()
  }
}

const errorHandler = require('./errorMiddleware')
const authMiddleware = require('./authMiddleware')
const adminMiddleware = require('./adminMiddleware')
const csrfMiddleware = require('./csrfMiddleware')
const validationMiddleware = require('./validation.middleware')

module.exports = {
  requestLogger,
  validateJWT,
  authorize,
  errorHandler,
  ...authMiddleware,
  ...adminMiddleware,
  ...csrfMiddleware,
  ...validationMiddleware
}
