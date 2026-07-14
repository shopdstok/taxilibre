const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const UserMFA = sequelize.define('UserMFA', {
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
  method: {
    type: DataTypes.ENUM('totp', 'sms', 'email', 'backup_codes'),
    allowNull: false,
    defaultValue: 'totp'
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'TOTP secret or encrypted backup codes'
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_enabled'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },
  backupCodes: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'backup_codes',
    comment: 'Array of hashed backup codes'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used_at'
  },
  deviceTrust: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'device_trust',
    defaultValue: [],
    comment: 'Array of trusted device fingerprints'
  }
}, {
  tableName: 'user_mfa',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'method']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['is_enabled']
    }
  ]
})

module.exports = UserMFA
