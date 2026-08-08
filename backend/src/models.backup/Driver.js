'use strict';

const { DataTypes } = require('sequelize');
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
  locationUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'location_updated_at'
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
    defaultValue: 0
  },
  totalRides: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  completionRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    }
  },
  acceptanceRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    }
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Average response time to ride requests in milliseconds'
  },
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
  walletBalance: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
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
    { fields: ['currentLat', 'currentLng'] },
    { fields: ['isVerified'] }
  ]
});

// Instance methods
Driver.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations (to be defined elsewhere)
// Driver.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
// Driver.hasOne(models.Vehicle, { foreignKey: 'driverId', onDelete: 'CASCADE' });
// Driver.hasMany(models.Ride, { foreignKey: 'driverId', as: 'driverRides' });

module.exports = Driver;