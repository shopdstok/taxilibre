'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_RIDE'),
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'For PERCENTAGE: percentage (e.g., 20 for 20%). For FIXED_AMOUNT: amount in currency. For FREE_RIDE: value unused.'
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum number of uses across all users; null for unlimited'
  },
  currentUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'current_uses'
  },
  maxUsesPerUser: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'max_uses_per_user'
  },
  minRideAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'min_ride_amount'
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'starts_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  applicableZones: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of pricing zone IDs where promotion applies'
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
  tableName: 'promotions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['code'] },
    { fields: ['isActive'] },
    { fields: ['startsAt', 'expiresAt'] }
  ]
});

// Instance methods
Promotion.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

Promotion.prototype.isValid = function () {
  const now = new Date();
  return this.isActive && 
         (!this.startsAt || now >= this.startsAt) && 
         (!this.expiresAt || now <= this.expiresAt) &&
         (!this.maxUses || this.currentUses < this.maxUses);
};

Promotion.prototype.calculateDiscount = function (rideAmount) {
  if (!this.isValid()) return 0;
  if (this.minRideAmount && rideAmount < this.minRideAmount) return 0;

  let discount = 0;
  switch (this.type) {
    case 'PERCENTAGE':
      discount = rideAmount * (this.value / 100);
      break;
    case 'FIXED_AMOUNT':
      discount = this.value;
      break;
    case 'FREE_RIDE':
      discount = rideAmount; // full amount
      break;
  }
  // Ensure discount does not exceed ride amount
  return Math.min(discount, rideAmount);
};

module.exports = Promotion;