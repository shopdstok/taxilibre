// Enhanced Payment Model - Matches Specifications
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
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
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
  // Stripe specific fields
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
  stripeTransferId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_transfer_id'
  },
  // Platform fees
  platformFee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'platform_fee'
  },
  // Driver earnings from this payment
  driverEarnings: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'driver_earings'
  },
  // Processing info
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
  // Dispute/refund info
  refundedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'refunded_amount'
  },
  refundReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'refund_reason'
  },
  disputedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'disputed_amount'
  },
  disputeReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'dispute_reason'
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
    { fields: ['stripePaymentIntentId'] },
    { fields: ['stripeChargeId'] },
    { fields: ['currency'] }
  ]
});

// Instance methods
Payment.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Check if payment can be refunded
Payment.prototype.canBeRefunded = function () {
  return this.status === 'CAPTURED' && 
         this.refundedAmount < this.amount;
};

// Calculate refundable amount
Payment.prototype.getRefundableAmount = function () {
  return this.amount - this.refundedAmount;
};

// Associations (to be defined elsewhere)
// Payment.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });

module.exports = Payment;