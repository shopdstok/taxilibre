const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const DeviceToken = sequelize.define('DeviceToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'user_device_unique'
  },
  deviceType: {
    type: DataTypes.ENUM('ios', 'android', 'web'),
    allowNull: false
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fcmToken: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'device_tokens',
  indexes: [
    {
      fields: ['userId', 'isActive']
    },
    {
      fields: ['fcmToken'],
      unique: true
    },
    {
      fields: ['deviceId', 'userId'],
      unique: true
    }
  ]
})

module.exports = DeviceToken
