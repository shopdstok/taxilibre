// Enhanced Pricing Zone Model - Matches Specifications
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
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Geofence definition (GeoJSON Polygon or MultiPolygon)
  boundaries: {
    type: DataTypes.GEOMETRY('POLYGON', 4326), // WGS84
    allowNull: false,
    validate: {
      // Custom validation could be added here
      isValidGeoJson: function (value) {
        // Basic validation - in production, use a proper GeoJSON validator
        return typeof value === 'object' && value !== null;
      }
    }
  },
  // Base pricing factors
  baseFare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    field: 'base_fare',
    validate: {
      min: 0
    }
  },
  perKmRate: {
    type: DataTypes.DECIMAL(6, 4), // e.g., 0.5000 EUR/km
    allowNull: false,
    field: 'per_km_rate',
    validate: {
      min: 0
    }
  },
  perMinuteRate: {
    type: DataTypes.DECIMAL(6, 4), // e.g., 0.2000 EUR/min
    allowNull: false,
    field: 'per_minute_rate',
    validate: {
      min: 0
    }
  },
  // Waiting time charges (per minute)
  waitingFeePerMinute: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
    field: 'waiting_fee_per_minute',
    validate: {
      min: 0
    }
  },
  // Minimum fare for trips within this zone
  minimumFare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    field: 'minimum_fare',
    validate: {
      min: 0
    }
  },
  // Cancellation fees
  cancellationFee: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    field: 'cancellation_fee',
    validate: {
      min: 0
    }
  },
  // Surge pricing multiplier (dynamic)
  surgeMultiplier: {
    type: DataTypes.DECIMAL(4, 2), // e.g., 1.0, 1.5, 2.0
    allowNull: false,
    field: 'surge_multiplier',
    defaultValue: 1.0,
    validate: {
      min: 1.0,
      max: 5.0
    }
  },
  // Peak hours pricing (applies during specified times)
  peakHoursMultiplier: {
    type: DataTypes.DECIMAL(4, 2), // e.g., 1.2 for 20% increase
    allowNull: true,
    field: 'peak_hours_multiplier',
    defaultValue: 1.0
  },
  // Peak hours definition (array of objects with start/end times)
  peakHours: {
    type: DataTypes.JSON, // Array of { start: "HH:mm", end: "HH:mm", days: [0,1,2,3,4,5,6] }
    allowNull: true,
    field: 'peak_hours',
    defaultValue: []
  },
  // Applicable vehicle types (empty array = all types)
  applicableVehicleTypes: {
    type: DataTypes.JSON, // Array of vehicle types from enum
    allowNull: true,
    field: 'applicable_vehicle_types',
    defaultValue: []
  },
  // Priority (higher number = higher priority when zones overlap)
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  // Status
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  },
  // Creation info
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
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
    { fields: ['status'] },
    { fields: ['priority'] },
    // Spatial index for efficient geo queries
    { type: 'SPATIAL', fields: ['boundaries'] }
  ]
});

// Instance methods
PricingZone.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  // Convert geometry to GeoJSON if needed
  if (this.boundaries) {
    // In a real implementation, you'd convert the geometry to GeoJSON
    // For now, we'll leave it as is or handle it in the service layer
  }
  return values;
};

// Check if a point (latitude, longitude) is within this zone's boundaries
// Note: This would typically be done in the service layer using PostGIS functions
PricingZone.prototype.containsPoint = function (latitude, longitude) {
  // This is a placeholder - actual implementation would use PostGIS ST_Contains
  // or similar spatial function in the pricing service
  return false; // To be implemented in service layer
};

// Check if pricing zone is active
PricingZone.prototype.isActive = function () {
  return this.status === 'ACTIVE';
};

// Get effective surge multiplier (base multiplier * peak hours multiplier if applicable)
PricingZone.prototype.getEffectiveSurgeMultiplier = function () {
  let effectiveMultiplier = parseFloat(this.surgeMultiplier);
  
  // Check if we're in peak hours
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6 (Sunday-Saturday)
  const currentTime = now.toTimeString().substring(0, 5); // "HH:mm"
  
  if (this.peakHours && Array.isArray(this.peakHours)) {
    for (const peakPeriod of this.peakHours) {
      if (Array.isArray(peakPeriod.days) && peakPeriod.days.includes(dayOfWeek)) {
        if (currentTime >= peakPeriod.start && currentTime <= peakPeriod.end) {
          effectiveMultiplier *= parseFloat(this.peakHoursMultiplier);
          break;
        }
      }
    }
  }
  
  return parseFloat(effectiveMultiplier.toFixed(2));
};

// Calculate fare for a trip within this zone
PricingZone.prototype.calculateFare = function (distanceKm, durationMinutes, waitingMinutes = 0) {
  let fare = this.baseFare;
  
  // Distance fare
  fare += distanceKm * parseFloat(this.perKmRate);
  
  // Time fare
  fare += durationMinutes * parseFloat(this.perMinuteRate);
  
  // Waiting fare
  fare += waitingMinutes * parseFloat(this.waitingFeePerMinute);
  
  // Apply surge pricing
  fare *= this.getEffectiveSurgeMultiplier();
  
  // Apply minimum fare
  if (this.minimumFare && fare < this.minimumFare) {
    fare = this.minimumFare;
  }
  
  return parseFloat(fare.toFixed(2));
};

module.exports = PricingZone;