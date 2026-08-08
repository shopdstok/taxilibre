'use strict';

const { DataTypes } = require('sequelize');
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
    { fields: ['role'] }
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
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ─── generatePasswordResetToken ───────────────────────────────────────────────
User.prototype.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  return resetToken;
};

// ─── Hook : hasher password avant création ────────────────────────────────────
User.beforeCreate(async (user) => {
  if (user.passwordHash && !user.passwordHash.startsWith('$2b$')) {
    // Assuming bcrypt hash starts with $2b$
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

module.exports = User;