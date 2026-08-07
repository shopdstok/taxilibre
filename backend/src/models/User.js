// Enhanced User Model - Matches Specifications
'use strict';

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      is: /^\+?[\d\s\-\(\)]+$/
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('passenger', 'driver', 'admin', 'support'),
    allowNull: false,
    defaultValue: 'passenger'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    default: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    default: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['email'] },
    { unique: true, fields: ['phone'], where: { phone: { [Op.not]: null } } },
    { fields: ['role'] },
    { fields: ['isVerified'] },
    { fields: ['isActive'] }
  ]
});

// ─── toJSON : masquer les champs sensibles ────────────────────────────────────
User.prototype.toJSON = function () {
  const values = { ...this.get() };

  delete values.passwordHash;

  return values;
};

// ─── comparePassword ──────────────────────────────────────────────────────────
User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// ─── generatePasswordResetToken ───────────────────────────────────────────────
User.prototype.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// ─── generateEmailVerificationToken ───────────────────────────────────────────
User.prototype.generateEmailVerificationToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

// ─── generatePhoneVerificationToken ───────────────────────────────────────────
User.prototype.generatePhoneVerificationToken = function () {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
};

// ─── Hook : hasher password avant création ────────────────────────────────────
User.beforeCreate(async (user) => {
  if (user.passwordHash && !user.passwordHash.startsWith('$2b$')) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
  }
});

// ─── Hook : hasher password avant mise à jour ─────────────────────────────────
User.beforeUpdate(async (user) => {
  if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2b$')) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
  }
});

// Associations will be defined elsewhere (e.g., in index.js or model associations)
// User.hasOne(models.Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
// User.hasOne(models.Driver, { foreignKey: 'userId', onDelete: 'CASCADE' });
// User.hasMany(models.Ride, { foreignKey: 'passengerId', as: 'passengerRides' });
// User.hasMany(models.Ride, { foreignKey: 'driverId', as: 'driverRides' });
// User.hasMany(models.RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
// User.hasMany(models.Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
// User.hasMany(models.Promotion, { foreignKey: 'createdBy', onDelete: 'SET NULL' });
// User.hasMany(models.PricingZone, { foreignKey: 'createdBy', onDelete: 'SET NULL' });

module.exports = User;
