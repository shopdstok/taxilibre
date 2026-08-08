'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'rides',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Amount in currency units (e.g., EUR)'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
    validate: {
      isIn: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  method: {
    type: DataTypes.ENUM('CARD', 'CASH', 'WALLET', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY'),
    allowNull: false,
    field: 'payment_method'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'DISPUTED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_payment_intent_id'
  },
  stripeChargeId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_charge_id'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'failure_reason'
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
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['rideId'] },
    { fields: ['status'] },
    { fields: ['stripePaymentIntentId'] }
  ]
});

// Instance methods
Payment.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations (to be defined elsewhere)
// Payment.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });

module.exports = Payment;