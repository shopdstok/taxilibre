// Enhanced Driver Model - Matches Specifications
'use strict';

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('OFFLINE', 'AVAILABLE', 'BUSY', 'ON_RIDE'),
    allowNull: false,
    defaultValue: 'OFFLINE'
  },
  // Real-time location (updated frequently)
  currentLat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    field: 'current_lat'
  },
  currentLng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    field: 'current_lng'
  },
  heading: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Heading in degrees (0-360)'
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Speed in km/h'
  },
  locationUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'location_updated_at'
  },
  // Metrics
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 5.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rating_count'
  },
  totalRides: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_rides'
  },
  completionRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    },
    field: 'completion_rate'
  },
  acceptanceRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    },
    field: 'acceptance_rate'
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Average response time to ride requests in milliseconds',
    field: 'response_time_ms'
  },
  // Verification
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },
  verificationStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  // Finances
  walletBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'wallet_balance'
  },
  stripeConnectId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_connect_id'
  },
  payoutMethod: {
    type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'),
    allowNull: false,
    defaultValue: 'WEEKLY'
  },
  // Earnings tracking
  totalEarnings: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'total_earnings'
  },
  weeklyEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'weekly_earnings'
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
  tableName: 'drivers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['currentLat', 'currentLng'], name: 'driver_location_idx' },
    { fields: ['isVerified'] },
    { fields: ['verificationStatus'] },
    { fields: ['stripeConnectId'] }
  ]
});

// Instance methods
Driver.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Update completion rate
Driver.prototype.updateCompletionRate = async function () {
  const { Ride } = require('../models');
  const completedRides = await Ride.count({
    where: {
      driverId: this.id,
      status: 'COMPLETED'
    }
  });
  
 const totalRides = await Ride.count({
   where: {
     driverId: this.id,
     status: {
        [Op.not]: 'CANCELLED_BY_DRIVER'
     }
   }
 });
  
  this.completionRate = totalRides > 0 ? completedRides / totalRides : 0;
  await this.save();
};

// Update acceptance rate
Driver.prototype.updateAcceptanceRate = async function () {
  // This would need to track ride requests vs acceptances
  // For now, we'll keep it as is and implement proper tracking later
  await this.save();
};

// Update rating
Driver.prototype.updateRating = function (newRating) {
  const totalRating = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = totalRating / this.ratingCount;
};

// Associations (to be defined elsewhere)
// Driver.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
// Driver.hasOne(models.Vehicle, { foreignKey: 'driverId', onDelete: 'CASCADE' });
// Driver.hasMany(models.Ride, { foreignKey: 'driverId', as: 'driverRides' });
// Driver.hasMany(models.DriverDocument, { foreignKey: 'driverId', onDelete: 'CASCADE' });

module.exports = Driver;
