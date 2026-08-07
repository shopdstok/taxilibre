// Enhanced Rating Model - Matches Specifications
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One rating per ride
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  fromUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'from_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  toUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'to_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500] // Limit comment length
    }
  },
  // Category-specific ratings (optional breakdown)
  punctuality: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  cleanliness: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  safety: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  communication: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  vehicleCondition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vehicle_condition',
    validate: {
      min: 1,
      max: 5
    }
  },
  // Complaint handling
  isComplaint: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_complaint'
  },
  complaintCategory: {
    type: DataTypes.ENUM(
      'SAFETY',
      'HARASSMENT', 
      'VEHICLE_CONDITION',
      'DRIVER_BEHAVIOR',
      'ROUTE_ISSUE',
      'PAYMENT_ISSUE',
      'APP_ISSUE',
      'OTHER'
    ),
    allowNull: true,
    field: 'complaint_category'
  },
  complaintDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'complaint_description'
  },
  complaintStatus: {
    type: DataTypes.ENUM(
      'PENDING',
      'INVESTIGATING',
      'RESOLVED',
      'REJECTED'
    ),
    allowNull: true,
    defaultValue: 'PENDING',
    field: 'complaint_status'
  },
  // Moderation fields
  isFlagged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_flagged'
  },
  flagReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'flag_reason'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  // Public/private flag
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_public'
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
  tableName: 'ratings',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['rideId'] }, // One rating per ride
    { fields: ['fromUserId'] },
    { fields: ['toUserId'] },
    { fields: ['score'] },
    { fields: ['isComplaint'] },
    { fields: ['complaintStatus'] },
    { fields: ['isFlagged'] },
    { fields: ['createdAt'] }
  ]
});

// Instance methods
Rating.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Check if rating is a complaint
Rating.prototype.isComplaintRating = function () {
  return this.isComplaint === true;
};

// Get average score from category ratings
Rating.prototype.getAverageCategoryScore = function () {
  const scores = [
    this.punctuality,
    this.cleanliness,
    this.safety,
    this.communication,
    this.vehicleCondition
  ].filter(score => score !== null);
  
  if (scores.length === 0) return null;
  
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 10) / 10; // Round to 1 decimal place
};

// Associations (to be defined elsewhere)
// Rating.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });
// Rating.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'rater' });
// Rating.belongsTo(models.User, { foreignKey: 'toUserId', as: 'ratedUser' });

module.exports = Rating;