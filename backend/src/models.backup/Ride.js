'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  passengerId: {
    type: DataTypes.UUID,
    allowNull: false,
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
    references: {
      model: 'drivers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  status: {
    type: DataTypes.ENUM(
      'PENDING',
      'DRIVER_ASSIGNED',
      'DRIVER_ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED_BY_PASSENGER',
      'CANCELLED_BY_DRIVER',
      'NO_DRIVER_FOUND'
    ),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  pickupAddress: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'pickup_address'
  },
  pickupLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    field: 'pickup_lat'
  },
  pickupLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    field: 'pickup_lng'
  },
  dropoffAddress: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'dropoff_address'
  },
  dropoffLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    field: 'dropoff_lat'
  },
  dropoffLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    field: 'dropoff_lng'
  },
  vehicleType: {
    type: DataTypes.ENUM('ECONOMY', 'COMFORT', 'PREMIUM', 'VAN', 'ACCESSIBLE'),
    allowNull: false,
    field: 'vehicle_type'
  },
  distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance in kilometers'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes'
  },
  baseFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'base_fare'
  },
  distanceFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'distance_fare'
  },
  timeFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'time_fare'
  },
  surgeMultiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    field: 'surge_multiplier'
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'subtotal'
  },
  serviceFee: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'service_fee'
  },
  tip: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'tip'
  },
  totalFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'total_fare'
  },
  driverEarnings: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'driver_earnings'
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    default: DataTypes.NOW,
    field: 'requested_at'
  },
  driverAssignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'driver_assigned_at'
  },
  driverArrivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'driver_arrived_at'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },
  cancellationReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cancellation_reason'
  },
  cancelledBy: {
    type: DataTypes.ENUM('PASSENGER', 'DRIVER', 'SYSTEM'),
    allowNull: true,
    field: 'cancelled_by'
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
  tableName: 'rides',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['passengerId'] },
    { fields: ['driverId'] },
    { fields: ['status'] },
    { fields: ['pickupLat', 'pickupLng'] },
    { fields: ['dropoffLat', 'dropoffLng'] },
    { fields: ['vehicleType'] }
  ]
});

// Instance methods
Ride.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

Ride.prototype.isActive = function () {
  return ['PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(this.status);
};

Ride.prototype.isCompleted = function () {
  return this.status === 'COMPLETED';
};

Ride.prototype.isCancelled = function () {
  return ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'].includes(this.status);
};

// Associations (to be defined elsewhere)
// Ride.belongsTo(models.User, { foreignKey: 'passengerId', as: 'passenger' });
// Ride.belongsTo(models.User, { foreignKey: 'driverId', as: 'driver' });
// Ride.hasOne(models.Payment, { foreignKey: 'rideId', onDelete: 'CASCADE' });
// Ride.hasOne(models.Rating, { foreignKey: 'rideId', onDelete: 'SET NULL' });

module.exports = Ride;