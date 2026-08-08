const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const NotificationPreferences = sequelize.define('NotificationPreferences', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  // Push notification preferences
  push: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      enabled: true,
      rideUpdates: true,
      promotions: true,
      emergency: true
    }
  },
  // Email notification preferences
  email: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      enabled: true,
      receipts: true,
      promotions: false,
      newsletters: false
    }
  },
  // SMS notification preferences
  sms: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      enabled: false,
      emergency: true,
      rideUpdates: false
    }
  },
  // In-app notification preferences
  inApp: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      enabled: true,
      rideUpdates: true,
      promotions: true,
      messages: true
    }
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
  tableName: 'notification_preferences',
  indexes: [
    {
      fields: ['userId'],
      unique: true
    }
  ]
})

// Instance methods
NotificationPreferences.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  // Remove sensitive info if any
  return values
}

module.exports = NotificationPreferences
