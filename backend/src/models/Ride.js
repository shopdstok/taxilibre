const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  passengerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'passenger_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'driver_id',
    references: {
      model: 'drivers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'vehicle_id',
    references: {
      model: 'vehicles',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  status: {
    type: DataTypes.ENUM(
      'requested',
      'accepted',
      'driver_arriving',
      'driver_arrived',
      'ride_started',
      'ride_completed',
      'cancelled',
      'no_driver_available',
      'expired'
    ),
    allowNull: false,
    defaultValue: 'requested'
  },
  pickupLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    field: 'pickup_latitude',
    validate: {
      min: -90,
      max: 90
    }
  },
  pickupLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    field: 'pickup_longitude',
    validate: {
      min: -180,
      max: 180
    }
  },
  pickupAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'pickup_address'
  },
  dropoffLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    field: 'dropoff_latitude',
    validate: {
      min: -90,
      max: 90
    }
  },
  dropoffLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    field: 'dropoff_longitude',
    validate: {
      min: -180,
      max: 180
    }
  },
  dropoffAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'dropoff_address'
  },
  estimatedDistance: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'estimated_distance',
    validate: {
      min: 0
    }
  },
  actualDistance: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    field: 'actual_distance',
    validate: {
      min: 0
    }
  },
  estimatedDuration: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    field: 'estimated_duration',
    validate: {
      min: 0
    }
  },
  actualDuration: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    field: 'actual_duration',
    validate: {
      min: 0
    }
  },
  baseFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_fare',
    validate: {
      min: 0
    }
  },
  pricePerKm: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'price_per_km',
    validate: {
      min: 0
    }
  },
  pricePerMinute: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'price_per_minute',
    validate: {
      min: 0
    }
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price',
    validate: {
      min: 0
    }
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'final_price',
    validate: {
      min: 0
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'wallet', 'apple_pay', 'google_pay'),
    allowNull: false,
    defaultValue: 'card',
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_payment_intent_id'
  },
  driverArrivalLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    field: 'driver_arrival_latitude'
  },
  driverArrivalLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    field: 'driver_arrival_longitude'
  },
  driverArrivalTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'driver_arrival_time'
  },
  rideStartTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ride_start_time'
  },
  rideEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ride_end_time'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  },
  cancelledBy: {
    type: DataTypes.ENUM('passenger', 'driver', 'system', 'timeout'),
    allowNull: true,
    field: 'cancelled_by'
  },
  cancellationTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancellation_time'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'requested_at'
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'accepted_at'
  },
  driverRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    field: 'driver_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  passengerRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    field: 'passenger_rating',
    validate: {
      min: 1,
      max: 5
    }
  },
  route: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  surgeMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    defaultValue: 1.0,
    field: 'surge_multiplier',
    validate: {
      min: 1.0,
      max: 5.0
    }
  },
  promoCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'promo_code'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0.00,
    field: 'discount_amount',
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'rides',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['passenger_id']
    },
    {
      fields: ['driver_id']
    },
    {
      fields: ['vehicle_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['requested_at']
    },
    {
      fields: ['pickup_latitude', 'pickup_longitude']
    },
    {
      fields: ['dropoff_latitude', 'dropoff_longitude']
    }
  ]
})

// Instance methods
Ride.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  return values
}

Ride.prototype.isActive = function () {
  return ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(this.status)
}

Ride.prototype.isCompleted = function () {
  return this.status === 'ride_completed'
}

Ride.prototype.isCancelled = function () {
  return this.status === 'cancelled'
}

Ride.prototype.canBeCancelled = function () {
  return ['requested', 'accepted'].includes(this.status)
}

Ride.prototype.calculateActualPrice = function () {
  if (this.actualDistance && this.actualDuration) {
    const distancePrice = this.actualDistance * this.pricePerKm
    const durationPrice = this.actualDuration * this.pricePerMinute
    const basePrice = this.baseFare + distancePrice + durationPrice
    return basePrice * (this.surgeMultiplier || 1.0) - (this.discountAmount || 0)
  }
  return this.totalPrice
}

Ride.prototype.getDuration = function () {
  return this.actualDuration || this.estimatedDuration
}

Ride.prototype.getDistance = function () {
  return this.actualDistance || this.estimatedDistance
}

// Hooks
Ride.beforeValidate(async (ride) => {
  // Calculate initial price if not set
  if (!ride.totalPrice) {
    const distancePrice = ride.estimatedDistance * ride.pricePerKm
    const durationPrice = ride.estimatedDuration * ride.pricePerMinute
    const basePrice = ride.baseFare + distancePrice + durationPrice
    ride.totalPrice = basePrice * (ride.surgeMultiplier || 1.0) - (ride.discountAmount || 0)
  }
  // Update final price when actual values are set
  if (ride.changed('actualDistance') || ride.changed('actualDuration')) {
    ride.finalPrice = ride.calculateActualPrice()
  }
})

module.exports = Ride
