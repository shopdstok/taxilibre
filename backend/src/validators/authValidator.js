const { z } = require('zod')

/**
 * Authentication Validation Schemas
 */

// Register schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number').optional(),
  role: z.enum(['passenger', 'driver']).optional().default('passenger')
})

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

// Refresh token schema
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

// Update profile schema
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[+]?[\d\s-()]+$/).optional(),
  avatar: z.string().url().optional()
})

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

// Request password reset schema
const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format')
})

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

// Send phone OTP schema
const sendPhoneOTPSchema = z.object({
  phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number')
})

// Verify phone OTP schema
const verifyPhoneOTPSchema = z.object({
  phone: z.string().regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number'),
  code: z.string().length(6, 'OTP must be 6 digits')
})

// Send email OTP schema
const sendEmailOTPSchema = z.object({
  email: z.string().email('Invalid email format')
})

// Verify email OTP schema
const verifyEmailOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'OTP must be 6 digits')
})

// OAuth callback schema
const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  role: z.enum(['passenger', 'driver']).optional().default('passenger')
})

// Apple Sign-In schema
const appleSignInSchema = z.object({
  idToken: z.string().min(1, 'Apple ID token is required'),
  role: z.enum(['passenger', 'driver']).optional().default('passenger')
})

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  sendPhoneOTPSchema,
  verifyPhoneOTPSchema,
  sendEmailOTPSchema,
  verifyEmailOTPSchema,
  oauthCallbackSchema,
  appleSignInSchema
}
