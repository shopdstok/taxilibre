'use strict'

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },

  // ✅ "password" dans le code → "password_hash" en DB
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },

  // ✅ "firstName" dans le code → "first_name" en DB
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'first_name'
  },

  // ✅ "lastName" dans le code → "last_name" en DB
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '',
    field: 'last_name'
  },

  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  role: {
    type: DataTypes.ENUM('admin', 'driver', 'passenger'),
    allowNull: false,
    defaultValue: 'passenger'
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },

  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified'
  },

  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'avatar_url'
  },

  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  },

  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verified_at'
  },

  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'phone_verified_at'
  },

  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_customer_id'
  },

  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'google_id'
  },

  appleId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'apple_id'
  },

  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'facebook_id'
  },

  microsoftId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'microsoft_id'
  },

  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_password_token'
  },

  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires'
  }

}, {
  tableName: 'users',
  timestamps: true,
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ]
})

// ─── Getter virtuel : .name retourne firstName + lastName ─────────────────────
Object.defineProperty(User.prototype, 'name', {
  get () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim()
  },
  set (value) {
    if (value && typeof value === 'string') {
      const parts = value.trim().split(' ')
      this.setDataValue('firstName', parts[0] || '')
      this.setDataValue('lastName', parts.slice(1).join(' ') || parts[0] || '')
    }
  }
})

// ─── toJSON : masquer les champs sensibles ────────────────────────────────────
User.prototype.toJSON = function () {
  const values = { ...this.get() }

  delete values.password
  delete values.resetPasswordToken
  delete values.resetPasswordExpires

  // Ajouter name virtuel
  values.name = `${values.firstName || ''} ${values.lastName || ''}`.trim()

  return values
}

// ─── comparePassword ──────────────────────────────────────────────────────────
User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

// ─── generatePasswordResetToken ───────────────────────────────────────────────
User.prototype.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 min
  return resetToken
}

// ─── Hook : hasher password avant création ────────────────────────────────────
User.beforeCreate(async (user) => {
  if (user.password && !user.password.startsWith('$2')) {
    user.password = await bcrypt.hash(user.password, 12)
  }

  // Si "name" passé directement (compatibilité seedAdmin)
  if (user.dataValues.name && !user.firstName) {
    const parts = user.dataValues.name.trim().split(' ')
    user.setDataValue('firstName', parts[0] || 'Admin')
    user.setDataValue('lastName', parts.slice(1).join(' ') || 'TaxiLibre')
  }
})

// ─── Hook : hasher password avant mise à jour ─────────────────────────────────
User.beforeUpdate(async (user) => {
  if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
    user.password = await bcrypt.hash(user.password, 12)
  }
})

module.exports = User
