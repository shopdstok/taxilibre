const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const PushSubscription = sequelize.define('PushSubscription', {
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
    onDelete: 'CASCADE'
  },
  deviceType: {
    type: DataTypes.ENUM('ios', 'android', 'web'),
    allowNull: false,
    field: 'device_type'
  },
  fcmToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'fcm_token',
    comment: 'Firebase Cloud Messaging token'
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'device_id',
    comment: 'Unique device identifier'
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'device_name'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used_at'
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      ride_updates: true,
      promotions: true,
      chat_messages: true,
      system_alerts: true,
      marketing: false
    }
  }
}, {
  tableName: 'push_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['fcm_token']
    },
    {
      fields: ['device_id']
    },
    {
      fields: ['is_active']
    }
  ]
})

module.exports = PushSubscription
