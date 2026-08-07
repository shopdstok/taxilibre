// Enhanced Promotion Model - Matches Specifications
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      isAlphanumeric: true,
      len: [3, 20]
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  discountType: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_RIDE'),
    allowNull: false,
    field: 'discount_type'
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  // For percentage discounts
  maxDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'max_discount_amount',
    validate: {
      min: 0
    }
  },
  // Usage limits
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'usage_limit',
    validate: {
      min: 1
    }
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'usage_count'
  },
  // User-specific limits
  usageLimitPerUser: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'usage_limit_per_user',
    validate: {
      min: 1
    }
  },
  // Applicability
  applicableTo: {
    type: DataTypes.ENUM('ALL_USERS', 'NEW_USERS_ONLY', 'EXISTING_USERS_ONLY', 'SPECIFIC_USER_GROUPS'),
    allowNull: false,
    field: 'applicable_to',
    defaultValue: 'ALL_USERS'
  },
  // Geographic restrictions (optional)
  applicableZones: {
    type: DataTypes.JSON, // Array of zone IDs or geo-fences
    allowNull: true,
    field: 'applicable_zones',
    defaultValue: []
  },
  // Time restrictions
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_from'
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'valid_until'
  },
  // Days of week (0-6, where 0 is Sunday)
  applicableDays: {
    type: DataTypes.JSON, // Array of numbers [0,1,2,3,4,5,6]
    allowNull: true,
    field: 'applicable_days',
    defaultValue: []
  },
  // Time of day restrictions
  validFromTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'valid_from_time'
  },
  validUntilTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'valid_until_time'
  },
  // Minimum requirements
  minimumFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'minimum_fare',
    validate: {
      min: 0
    }
  },
  minimumDistance: {
    type: DataTypes.DECIMAL(5, 2), // in km
    allowNull: true,
    field: 'minimum_distance',
    validate: {
      min: 0
    }
  },
  // Vehicle type restrictions
  applicableVehicleTypes: {
    type: DataTypes.JSON, // Array of vehicle types from enum
    allowNull: true,
    field: 'applicable_vehicle_types',
    defaultValue: []
  },
  // Status
  status: {
    type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'),
    allowNull: false,
    defaultValue: 'DRAFT'
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
  tableName: 'promotions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['code'] },
    { fields: ['status'] },
    { fields: ['validFrom', 'validUntil'] },
    { fields: ['discountType'] },
    { fields: ['applicableTo'] }
  ]
});

// Instance methods
Promotion.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Check if promotion is currently valid
Promotion.prototype.isValid = function () {
  const now = new Date();
  return this.status === 'ACTIVE' &&
         this.validFrom <= now &&
         this.validUntil >= now;
};

// Check if promotion can be applied to a specific ride
Promotion.prototype.canApplyToRide = function (ride) {
  if (!this.isValid()) return false;
  
  // Check usage limits
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  
  // Check minimum fare
  if (this.minimumFare && ride.totalFare < this.minimumFare) return false;
  
  // Check minimum distance
  if (this.minimumDistance && ride.distance < this.minimumDistance) return false;
  
  // Check vehicle type restrictions
  if (this.applicableVehicleTypes.length > 0 && 
      !this.applicableVehicleTypes.includes(ride.vehicleType)) {
    return false;
  }
  
  // Check day of week
  const dayOfWeek = new Date().getDay(); // 0-6
  if (this.applicableDays.length > 0 && 
      !this.applicableDays.includes(dayOfWeek)) {
    return false;
  }
  
  // Check time of day
  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS
  
  if (this.validFromTime && currentTime < this.validFromTime.toString()) return false;
  if (this.validUntilTime && currentTime > this.validUntilTime.toString()) return false;
  
  return true;
};

// Calculate discount amount for a given fare
Promotion.prototype.calculateDiscount = function (fare) {
  if (!this.canApplyToRide({ totalFare: fare })) return 0;
  
  let discount = 0;
  
  switch (this.discountType) {
    case 'PERCENTAGE':
      discount = fare * (this.discountValue / 100);
      // Apply max discount cap if set
      if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
        discount = this.maxDiscountAmount;
      }
      break;
      
  case 'FIXED_AMOUNT':
      discount = Math.min(this.discountValue, fare); // Can't exceed fare
      break;
      
    case 'FREE_RIDE':
      discount = fare; // Full fare discount
      break;
  }
  
  return parseFloat(discount.toFixed(2)); // Ensure 2 decimal places
};

// Increment usage count
Promotion.prototype.incrementUsage = async function () {
  this.usageCount += 1;
  await this.save();
};

// Associations (to be defined elsewhere)
// Promotion.hasMany(models.Ride, { foreignKey: 'promoCode', sourceKey: 'code' });
// Promotion.hasMany(models.PromotionUsage, { foreignKey: 'promotionId', onDelete: 'CASCADE' });

module.exports = Promotion;