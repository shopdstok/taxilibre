const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
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
    validate: {
      min: 0.01
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'wallet', 'apple_pay', 'google_pay'),
    allowNull: false,
    field: 'payment_method'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_payment_intent_id'
  },
  stripeChargeId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_charge_id'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_id'
  },
  platformFee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'platform_fee',
    validate: {
      min: 0
    }
  },
  driverEarnings: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'driver_earnings',
    validate: {
      min: 0
    }
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'failure_reason'
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refund_reason'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    field: 'refund_amount',
    validate: {
      min: 0
    }
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
    validate: {
      isIn: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    defaultValue: 1.000000,
    field: 'exchange_rate'
  },
  originalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_amount'
  },
  paymentProvider: {
    type: DataTypes.ENUM('stripe', 'paypal', 'square', 'cash'),
    allowNull: false,
    defaultValue: 'stripe',
    field: 'payment_provider'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['ride_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['stripe_payment_intent_id']
    },
    {
      fields: ['processed_at']
    }
  ]
})

// Instance methods
Payment.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  return values
}

Payment.prototype.isCompleted = function () {
  return this.status === 'completed'
}

Payment.prototype.isFailed = function () {
  return this.status === 'failed'
}

Payment.prototype.isRefunded = function () {
  return ['refunded', 'partially_refunded'].includes(this.status)
}

Payment.prototype.canBeRefunded = function () {
  return this.status === 'completed' && !this.isRefunded()
}

Payment.prototype.getNetAmount = function () {
  return this.amount - this.platformFee
}

Payment.prototype.getDriverNetEarnings = function () {
  return this.driverEarnings
}

// Hooks
Payment.beforeCreate(async (payment) => {
  // Calculate platform fee (15% by default)
  if (payment.platformFee === 0) {
    payment.platformFee = payment.amount * 0.15
    payment.driverEarnings = payment.amount - payment.platformFee
  }
})

Payment.beforeUpdate(async (payment) => {
  // Recalculate fees if amount changes
  if (payment.changed('amount')) {
    payment.platformFee = payment.amount * 0.15
    payment.driverEarnings = payment.amount - payment.platformFee
  }
})

module.exports = Payment
