const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
    allowNull: false,
    field: 'driver_id',
    references: {
      model: 'drivers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
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
      len: [0, 1000]
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  responseFromDriver: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response_from_driver'
  },
  responseFromPassenger: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response_from_passenger'
  },
  moderatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'moderated_at'
  },
  moderatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'moderated_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  flags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  helpfulCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'helpful_count'
  },
  reportCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'report_count'
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['ride_id', 'passenger_id']
    },
    {
      fields: ['driver_id']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Instance methods
Review.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  return values
}

Review.prototype.isPositive = function () {
  return this.rating >= 4.0
}

Review.prototype.isNegative = function () {
  return this.rating <= 2.0
}

Review.prototype.isNeutral = function () {
  return this.rating > 2.0 && this.rating < 4.0
}

Review.prototype.getRatingText = function () {
  if (this.rating >= 4.5) return 'Excellent'
  if (this.rating >= 4.0) return 'Very Good'
  if (this.rating >= 3.5) return 'Good'
  if (this.rating >= 3.0) return 'Average'
  if (this.rating >= 2.0) return 'Below Average'
  return 'Poor'
}

Review.prototype.canBeEdited = function () {
  // Reviews can be edited within 24 hours of creation
  const now = new Date()
  const created = new Date(this.createdAt)
  const hoursDiff = (now - created) / (1000 * 60 * 60)
  return hoursDiff < 24 && this.isActive
}

// Hooks
Review.beforeCreate(async (review) => {
  // Validate rating range
  if (review.rating < 1 || review.rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }
})

Review.beforeUpdate(async (review) => {
  // Log moderation if review is being moderated
  if (review.changed('moderatedAt') && review.moderatedAt) {
  }
})

module.exports = Review
