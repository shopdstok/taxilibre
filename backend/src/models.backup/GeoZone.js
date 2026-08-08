const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const GeoZone = sequelize.define('GeoZone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM(
      'service_area', // Zone de service active
      'restricted', // Zone interdite
      'airport', // Aéroport (surtaxe)
      'premium', // Zone premium (tarif plus élevé)
      'surge', // Zone avec surge pricing
      'city_center', // Centre-ville
      'suburb' // Banlieue
    ),
    allowNull: false,
    defaultValue: 'service_area'
  },
  geometry: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'GeoJSON Polygon coordinates [[lng, lat], [lng, lat], ...]'
  },
  centerLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    field: 'center_latitude'
  },
  centerLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    field: 'center_longitude'
  },
  radiusKm: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
    field: 'radius_km',
    comment: 'Radius for circular zones, null for polygon zones'
  },
  baseFareMultiplier: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.0,
    field: 'base_fare_multiplier',
    comment: 'Multiplier for base fare in this zone'
  },
  perKmMultiplier: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.0,
    field: 'per_km_multiplier'
  },
  perMinuteMultiplier: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.0,
    field: 'per_minute_multiplier'
  },
  minimumFare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    field: 'minimum_fare',
    comment: 'Minimum fare for rides starting in this zone'
  },
  surgeThreshold: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'surge_threshold',
    comment: 'Number of requests to trigger surge pricing'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'City name for organization'
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Country code (FR, US, etc.)'
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Europe/Paris'
  },
  peakHours: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'peak_hours',
    defaultValue: [],
    comment: '[{start: "08:00", end: "10:00", multiplier: 1.5}]'
  },
  restrictedVehicleTypes: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'restricted_vehicle_types',
    defaultValue: [],
    comment: 'Vehicle types not allowed in this zone'
  }
}, {
  tableName: 'geo_zones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['country', 'city']
    },
    {
      fields: ['center_latitude', 'center_longitude']
    }
  ]
})

module.exports = GeoZone
