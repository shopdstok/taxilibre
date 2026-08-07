// Notification Model
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'RIDE_REQUEST',
      'RIDE_ACCEPTED',
      'DRIVER_ARRIVED',
      'RIDE_STARTED',
      'RIDE_COMPLETED',
      'RIDE_CANCELLED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PROMOTION_AVAILABLE',
      'SAFETY_ALERT',
      'SUPPORT_MESSAGE',
      'MARKETING',
      'SYSTEM_UPDATE'
    ),
    allowNull: false,
    field: 'notification_type'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
    allowNull: false,
    defaultValue: 'NORMAL'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  // Related entity IDs for quick reference
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
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'payment_id',
    references: {
      model: 'payments',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  promotionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'promotion_id',
    references: {
      model: 'promotions',
      key: 'id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  // Data payload for rich notifications
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  // Expiration for transient notifications
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
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
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['userId'] },
    { fields: ['isRead'] },
    { fields: ['type'] },
    { fields: ['priority'] },
    { fields: ['createdAt'] },
    { fields: ['expiresAt'] },
    { fields: ['rideId'] },
    { fields: ['paymentId'] },
    { fields: ['promotionId'] }
  ]
});

// Instance methods
Notification.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Mark notification as read
Notification.prototype.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
};

// Check if notification is expired
Notification.prototype.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Associations (to be defined elsewhere)
// Notification.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
// Notification.belongsTo(models.Ride, { foreignKey: 'rideId', onDelete: 'SET NULL' });
// Notification.belongsTo(models.Payment, { foreignKey: 'paymentId', onDelete: 'SET NULL' });
// Notification.belongsTo(models.Promotion, { foreignKey: 'promotionId', onDelete: 'SET NULL' });

module.exports = Notification;