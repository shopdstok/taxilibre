'use strict'

const { z } = require('zod')

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(z.string().min(2, 'Name must be at least 2 characters').max(100)),
  phone: z.string().optional(),
  role: z.enum(['passenger', 'driver']).optional().default('passenger')
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatar: z.string().optional()
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional()
})

// ✅ Noms alignés avec validation.middleware.js
const sendOTPSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional()
})

const verifyOTPSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  code: z.string().min(4, 'OTP required')
})

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOTPSchema,
  verifyOTPSchema
}
