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
    unique: true,
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
    allowNull: true
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Rating categories e.g., { cleanliness: 5, driving: 4, punctuality: 5 }'
  },
  isComplaint: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_complaint'
  },
  complaintStatus: {
    type: DataTypes.ENUM('PENDING', 'RESOLVED'),
    allowNull: true,
    field: 'complaint_status'
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
    { fields: ['rideId'] },
    { fields: ['fromUserId'] },
    { fields: ['toUserId'] },
    { fields: ['score'] }
  ]
});

// Instance methods
Rating.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations (to be defined elsewhere)
// Rating.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });
// Rating.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
// Rating.belongsTo(models.User, { foreignKey: 'toUserId', as: 'toUser' });

module.exports = Rating;