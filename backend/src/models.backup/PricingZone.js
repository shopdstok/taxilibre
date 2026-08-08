'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PricingZone = sequelize.define('PricingZone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'FR'
  },
  geometry: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'GeoJSON Polygon representing the zone boundaries'
  },
  baseFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'base_fare'
  },
  perKmRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'per_km_rate'
  },
  perMinuteRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'per_minute_rate'
  },
  minimumFare: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'minimum_fare'
  },
  surgeEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'surge_enabled'
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
  tableName: 'pricing_zones',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['city', 'country'] },
    { fields: ['surgeEnabled'] }
  ]
});

// Instance methods
PricingZone.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations (to be defined elsewhere)
// PricingZone.hasMany(models.Ride, { foreignKey: 'pricingZoneId' }); // if we add zoneId to Ride

module.exports = PricingZone;