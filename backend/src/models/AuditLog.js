const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'admin_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Action performed (login, logout, user_created, ride_created, etc.)'
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'entity_type',
    comment: 'Type of entity affected (user, ride, payment, etc.)'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'entity_id',
    comment: 'ID of the entity affected'
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Changes made to the entity'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata about the event'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['admin_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity_type']
    },
    {
      fields: ['created_at']
    }
  ]
})

module.exports = AuditLog
