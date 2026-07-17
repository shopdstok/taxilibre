const { AppError } = require('./errorMiddleware')
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
       sendOTPSchema, verifyOTPSchema, changePasswordSchema, updateProfileSchema } = require('../validators/authValidator')
const { createRideSchema, acceptRideSchema } = require('../validators/rideValidator')

/**
 * Validation middleware using Zod
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      const errors = error.errors.map(err => ({
        [err.path.join('.')]: err.message
      }))
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors)
    }
  }
}

/**
 * Validation rules for auth endpoints using Zod
 */
const authValidators = {
  register: (req, res, next) => {
    registerSchema.parse(req.body)
    next()
  },
  login: (req, res, next) => {
    loginSchema.parse(req.body)
    next()
  },
  forgotPassword: (req, res, next) => {
    forgotPasswordSchema.parse(req.body)
    next()
  },
  resetPassword: (req, res, next) => {
    resetPasswordSchema.parse(req.body)
    next()
  },
  sendOTP: (req, res, next) => {
    sendOTPSchema.parse(req.body)
    next()
  },
  verifyOTP: (req, res, next) => {
    verifyOTPSchema.parse(req.body)
    next()
  },
  changePassword: (req, res, next) => {
    changePasswordSchema.parse(req.body)
    next()
  },
  updateProfile: (req, res, next) => {
    updateProfileSchema.parse(req.body)
    next()
  }
}

/**
 * Validation rules for ride endpoints using Zod
 */
const rideValidators = {
  createRide: (req, res, next) => {
    try {
      createRideSchema.parse(req.body)
      next()
    } catch (error) {
      const errors = error.errors.map(err => ({
        [err.path.join('.')]: err.message
      }))
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors)
    }
  },
  acceptRide: (req, res, next) => {
    try {
      acceptRideSchema.parse(req.body)
      next()
    } catch (error) {
      const errors = error.errors.map(err => ({
        [err.path.join('.')]: err.message
      }))
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors)
    }
  }
}

module.exports = {
  validate,
  authValidators,
  rideValidators
}
