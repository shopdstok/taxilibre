const { body, validationResult } = require('express-validator')
const { AppError } = require('./errorMiddleware')
const { createRideSchema, acceptRideSchema } = require('../validators/rideValidator')

/**
 * Validation middleware using express-validator
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const extractedErrors = []
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))

    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', extractedErrors)
  }
}

/**
 * Validation rules for auth endpoints
 */
const authValidators = {
  register: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('role').optional().isIn(['passenger', 'driver']).withMessage('Role must be either passenger or driver')
  ],

  login: [
    body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
  ],

  forgotPassword: [
    body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],

  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
  ],

  sendOTP: [
    body('phone').custom((value, { req }) => {
      if (!value && !req.body.email) {
        throw new Error('Either phone or email is required')
      }
      if (value && !value.toString().match(/^\+?[1-9]\d{1,14}$/)) {
        throw new Error('Please provide a valid phone number')
      }
      return true
    }),
    body('email').custom((value, { req }) => {
      if (!value && !req.body.phone) {
        throw new Error('Either phone or email is required')
      }
      if (value && !value.toString().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Please provide a valid email')
      }
      return true
    })
  ],

  verifyOTP: [
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must contain only numbers')
  ],

  changePassword: [
    body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
  ],

  updateProfile: [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('avatar').optional().isURL().withMessage('Please provide a valid URL for avatar')
  ]
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
