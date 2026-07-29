'use strict';

const { AppError } = require('./errorMiddleware');

// ─── Import schemas ───────────────────────────────────────────────────────────
let registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
    sendOTPSchema, verifyOTPSchema, changePasswordSchema, updateProfileSchema;

try {
  ({
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    sendOTPSchema,
    verifyOTPSchema,
    changePasswordSchema,
    updateProfileSchema
  } = require('../validators/authValidator'));
} catch (err) {
  console.error('[Validation] Failed to load authValidator:', err.message);
}

let createRideSchema, acceptRideSchema;
try {
  ({ createRideSchema, acceptRideSchema } = require('../validators/rideValidator'));
} catch (err) {
  console.error('[Validation] Failed to load rideValidator:', err.message);
}

// ─── Helper : valider avec un schema Zod ─────────────────────────────────────
const validateSchema = (schema, req, res, next) => {
  // Si schema non chargé, on laisse passer
  if (!schema) return next();

  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      field: err.path?.join('.') || 'unknown',
      message: err.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: errors
    });
  }
};

// ─── Auth validators ──────────────────────────────────────────────────────────
const authValidators = {
  register:      (req, res, next) => validateSchema(registerSchema, req, res, next),
  login:         (req, res, next) => validateSchema(loginSchema, req, res, next),
  forgotPassword:(req, res, next) => validateSchema(forgotPasswordSchema, req, res, next),
  resetPassword: (req, res, next) => validateSchema(resetPasswordSchema, req, res, next),
  sendOTP:       (req, res, next) => validateSchema(sendOTPSchema, req, res, next),
  verifyOTP:     (req, res, next) => validateSchema(verifyOTPSchema, req, res, next),
  changePassword:(req, res, next) => validateSchema(changePasswordSchema, req, res, next),
  updateProfile: (req, res, next) => validateSchema(updateProfileSchema, req, res, next),
};

// ─── Ride validators ──────────────────────────────────────────────────────────
const rideValidators = {
  createRide: (req, res, next) => validateSchema(createRideSchema, req, res, next),
  acceptRide: (req, res, next) => validateSchema(acceptRideSchema, req, res, next),
};

module.exports = { authValidators, rideValidators };