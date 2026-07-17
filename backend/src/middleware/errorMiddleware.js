/**
 * Error handling middleware for consistent error responses
 */
const { logger } = require('../services/loggingService')

/**
 * Handle validation errors
 */
const handleValidationError = (error, req, res, next) => {
  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }))

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      errors
    })
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    })
  }

  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path || 'unknown'
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      error: 'DUPLICATE_ENTRY',
      field
    })
  }

  // Handle Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference to related record',
      error: 'FOREIGN_KEY_CONSTRAINT'
    })
  }

  // Handle file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    })
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files',
      error: 'TOO_MANY_FILES'
    })
  }

  // Handle Stripe errors
  if (error.type === 'StripeCardError') {
    return res.status(400).json({
      success: false,
      message: 'Payment failed: ' + error.message,
      error: 'PAYMENT_FAILED',
      stripeCode: error.code
    })
  }

  if (error.type === 'StripeRateLimitError') {
    return res.status(429).json({
      success: false,
      message: 'Too many payment requests',
      error: 'RATE_LIMIT_EXCEEDED'
    })
  }

  next(error)
}

/**
 * Handle 404 errors
 */
const handleNotFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  })
}

/**
 * Handle async errors
 */
const handleAsyncError = (error, req, res, next) => {
  // Log error details
  logError(error, req);

  // Don't send error details in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }

  // Send detailed error in development
  res.status(500).json({
    success: false,
    message: error.message,
    error: 'INTERNAL_SERVER_ERROR',
    stack: error.stack,
    url: req.originalUrl,
    method: req.method
  });
}

/**
 * Handle database connection errors
 */
const handleDatabaseError = (error, req, res, next) => {

  if (error.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'DATABASE_CONNECTION_ERROR'
    })
  }

  if (error.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection refused',
      error: 'DATABASE_CONNECTION_REFUSED'
    })
  }

  if (error.name === 'SequelizeAccessDeniedError') {
    return res.status(503).json({
      success: false,
      message: 'Database access denied',
      error: 'DATABASE_ACCESS_DENIED'
    })
  }

  next(error)
}

/**
 * Handle authorization errors
 */
const handleAuthError = (error, req, res, next) => {

  const authErrors = {
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
    DRIVER_REQUIRED: 'Driver access is required for this action',
    PASSENGER_REQUIRED: 'Passenger access is required for this action',
    ADMIN_REQUIRED: 'Admin access is required for this action',
    DRIVER_VERIFICATION_REQUIRED: 'Driver verification is required',
    DRIVER_PROFILE_REQUIRED: 'Complete driver profile is required',
    ACCESS_DENIED: 'Access denied: You do not own this resource'
  }

  const message = authErrors[error.message] || 'Authorization error'

  res.status(403).json({
    success: false,
    message,
    error: error.message
  })
}

/**
 * Handle rate limiting errors
 */
const handleRateLimitError = (error, req, res, next) => {
  logError(error, req);
  res.status(429).json({
    success: false,
    message: error.message || 'Too many requests',
    error: 'RATE_LIMIT_EXCEEDED',
    retryAfter: error.retryAfter
  });
}

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor (message, statusCode = 500, errorType = 'APPLICATION_ERROR', details = null) {
    super(message)
    this.statusCode = statusCode
    this.errorType = errorType
    this.details = details
    this.isOperational = true
  }
}

/**
 * Handle application-specific errors
 */
const handleAppError = (error, req, res, next) => {
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: error.errorType,
      details: error.details
    });
  }

  // For non-operational errors, pass to next error handler
  next(error);
};

/**
 * Log errors for monitoring
 */
const logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    level: 'error'
  };

  if (req) {
    logData.request = {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user?.id,
      role: req.user?.role
    };
  }

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Would integrate with service like Winston, Loggly, etc.
    logger.error(JSON.stringify(logData)); // fallback
  } else {
    logger.error(JSON.stringify(logData));
  }
};

/**
 * Success response helper
 */
const successResponse = (data = null, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * Error response helper
 */
const errorResponse = (message = 'Error', errorType = 'APPLICATION_ERROR', statusCode = 500, details = null) => {
  return {
    success: false,
    message,
    error: errorType,
    details,
    timestamp: new Date().toISOString()
  }
}

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  // Handle validation errors
  if (error.name === 'SequelizeValidationError') {
    return handleValidationError(error, req, res, next)
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return handleValidationError(error, req, res, next) // Reuse the JWT handling logic
  }

  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return handleValidationError(error, req, res, next) // Reuse logic
  }

  // Handle Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return handleValidationError(error, req, res, next) // Reuse logic
  }

  // Handle file upload errors
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    return handleValidationError(error, req, res, next) // Reuse logic
  }

  // Handle Stripe errors
  if (error.type && error.type.startsWith('Stripe')) {
    return handleValidationError(error, req, res, next) // Reuse logic
  }

  // Handle database errors
  if (error.name && error.name.includes('Sequelize')) {
    return handleDatabaseError(error, req, res, next)
  }

  // Handle authorization errors
  if (error.message && ['INSUFFICIENT_PERMISSIONS', 'DRIVER_REQUIRED', 'PASSENGER_REQUIRED', 'ADMIN_REQUIRED', 'DRIVER_VERIFICATION_REQUIRED', 'DRIVER_PROFILE_REQUIRED', 'ACCESS_DENIED'].includes(error.message)) {
    return handleAuthError(error, req, res, next)
  }

  // Handle rate limiting errors
  if (error.message && error.message.includes('Too many')) {
    return handleRateLimitError(error, req, res, next)
  }

  // Handle application errors
  if (error.isOperational) {
    return handleAppError(error, req, res, next)
  }

  // Default to async error handler
  return handleAsyncError(error, req, res, next)
}

module.exports = {
  errorHandler,
  successResponse,
  errorResponse,
  AppError
}
