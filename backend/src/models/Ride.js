// Enhanced Ride Model - Matches Specifications
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Participants
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
  // Status
  status: {
    type: DataTypes.ENUM(
      'PENDING',           // Recherche chauffeur
      'DRIVER_ASSIGNED',   // Chauffeur trouvé
      'DRIVER_ARRIVED',    // Chauffeur sur place
      'IN_PROGRESS',       // Course en cours
      'COMPLETED',         // Terminée
      'CANCELLED_BY_PASSENGER',
      'CANCELLED_BY_DRIVER',
      'CANCELLED_BY_SYSTEM',
      'CANCELLED_BY_ADMIN',
      'NO_DRIVER_FOUND',
      'EXPIRED'
    ),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  // Pickup location
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
  pickupZoneId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'pickup_zone_id',
    references: {
      model: 'pricing_zones',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  // Dropoff location
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
  dropoffZoneId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'dropoff_zone_id',
    references: {
      model: 'pricing_zones',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  // Course details
  vehicleType: {
    type: DataTypes.ENUM('ECONOMY', 'COMFORT', 'PREMIUM', 'VAN', 'ACCESSIBLE'),
    allowNull: false,
    field: 'vehicle_type'
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
  distance: {
    type: DataTypes.DECIMAL(8, 3),
    allowNull: true,
    comment: 'Distance in kilometers'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes'
  },
  // Detailed pricing (matching specification exactly)
  baseFare: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    field: 'base_fare'
  },
  distanceFare: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    field: 'distance_fare'
  },
  timeFare: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    field: 'time_fare'
  },
  surgeMultiplier: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    defaultValue: 1.00,
    field: 'surge_multiplier'
  },
  waitingFee: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'waiting_fee'
  },
  subtotal: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'subtotal'
  },
  serviceFee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'service_fee'
  },
  tip: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'tip'
  },
  totalFare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'total_fare'
  },
  // Driver earnings (exact match to spec)
  driverEarnings: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'driver_earnings'
  },
  // Platform fee breakdown
  platformFee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'platform_fee'
  },
  // Timestamps
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
    type: DataTypes.ENUM('PASSENGER', 'DRIVER', 'SYSTEM', 'ADMIN'),
    allowNull: true,
    field: 'cancelled_by'
  },
  // Additional fields for enhanced functionality
  promoCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'promo_code'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'discount_amount'
  },
  // Rating fields (will be updated after completion)
  passengerRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  driverRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  passengerReview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  driverReview: {
    type: DataTypes.TEXT,
    allowNull: true
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
    { fields: ['pickupZoneId'] },
    { fields: ['dropoffZoneId'] },
    { fields: ['vehicleType'] },
    { fields: ['vehicleId'] },
    { fields: ['requestedAt'] },
    { fields: ['promoCode'] }
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

// Calculate fare components based on specification
Ride.prototype.calculateFare = function (pricingDetails) {
  // This would typically be called before creating the ride
  // to set the fare components
  if (pricingDetails) {
    this.baseFare = pricingDetails.baseFare || 0;
    this.distanceFare = pricingDetails.distanceFare || 0;
    this.timeFare = pricingDetails.timeFare || 0;
    this.waitingFee = pricingDetails.waitingFee || 0;
    this.surgeMultiplier = pricingDetails.surgeMultiplier || 1.0;
    
    // Calculate subtotal
    this.subtotal = parseFloat(this.baseFare) + 
                   parseFloat(this.distanceFare) + 
                   parseFloat(this.timeFare) + 
                   parseFloat(this.waitingFee);
    
    // Apply surge multiplier
    this.subtotal = this.subtotal * parseFloat(this.surgeMultiplier);
    
    // Calculate service fee (platform commission)
    this.serviceFee = this.subtotal * 0.20; // 20% as per spec
    this.platformFee = this.serviceFee;
    
    // Calculate total before tip
    const totalBeforeTip = this.subtotal;
    
    // Total fare
    this.totalFare = totalBeforeTip + parseFloat(this.tip || 0);
    
    // Driver earnings (total - platform fee)
    this.driverEarnings = this.subtotal - this.serviceFee;
  }
};

// Update ride status with appropriate timestamps
Ride.prototype.updateStatus = async function (newStatus, options = {}) {
  const now = new Date();
  
  const updateData = {
    status: newStatus,
    updatedAt: now
  };
  
  // Set specific timestamps based on status
  switch (newStatus) {
    case 'DRIVER_ASSIGNED':
      updateData.driverAssignedAt = now;
      break;
    case 'DRIVER_ARRIVED':
      updateData.driverArrivedAt = now;
      break;
    case 'IN_PROGRESS':
      updateData.startedAt = now;
      break;
    case 'COMPLETED':
      updateData.completedAt = now;
      break;
    case 'CANCELLED_BY_PASSENGER':
    case 'CANCELLED_BY_DRIVER':
    case 'CANCELLED_BY_SYSTEM':
    case 'CANCELLED_BY_ADMIN':
      updateData.cancelledAt = now;
      if (options.reason) updateData.cancellationReason = options.reason;
      if (options.cancelledBy) updateData.cancelledBy = options.cancelledBy;
      break;
  }
  
  // Apply any additional options
  Object.assign(updateData, options);
  
  return await this.update(updateData);
};

// Associations are defined in models/index.js
// - belongsTo User (passengerId) as passenger
// - belongsTo User (driverId) as driver
// - belongsTo Vehicle (vehicleId)
// - hasOne Payment
// - hasOne Rating
// - belongsTo Promotion (promoCode)
// - belongsTo PricingZone (pickupZoneId)
// - belongsTo PricingZone (dropoffZoneId)

module.exports = Ride;
