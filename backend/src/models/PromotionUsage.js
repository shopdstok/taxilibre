// Promotion Usage Model - Tracks individual uses of promotions
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PromotionUsage = sequelize.define('PromotionUsage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  promotionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'promotion_id',
    references: {
      model: 'promotions',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'ride_id',
    references: {
      model: 'rides',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'discount_amount',
    validate: {
      min: 0
    }
  },
  originalFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'original_fare',
    validate: {
      min: 0
    }
  },
  finalFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'final_fare',
    validate: {
      min: 0
    }
  },
  appliedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    default: DataTypes.NOW,
    field: 'applied_at'
  }
}, {
  tableName: 'promotion_usages',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['promotionId'] },
    { fields: ['userId'] },
    { fields: ['rideId'] },
    { fields: ['appliedAt'] }
  ]
});

// Instance methods
PromotionUsage.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations
// PromotionUsage.belongsTo(models.Promotion, { foreignKey: 'promotionId', onDelete: 'CASCADE' });
// PromotionUsage.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
// PromotionUsage.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'SET NULL' });

module.exports = PromotionUsage;