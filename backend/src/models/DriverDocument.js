// Driver Document Model - For driver verification
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DriverDocument = sequelize.define('DriverDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  type: {
    type: DataTypes.ENUM(
      'LICENSE',
      'IDENTITY',
      'INSURANCE',
      'REGISTRATION',
      'BACKGROUND_CHECK',
      'VEHICLE_INSPECTION'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  documentUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'document_url'
  },
  // For OCR extraction and validation
  extractedData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Data extracted from document via OCR'
  },
  validationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    default: DataTypes.NOW,
    field: 'uploaded_at'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'reviewed_by'
  },
  rejectionReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'rejection_reason'
  },
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
  tableName: 'driver_documents',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['driverId'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['expiresAt'] }
  ]
});

// Instance methods
DriverDocument.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Check if document is expired or expiring soon
DriverDocument.prototype.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

DriverDocument.prototype.isExpiringSoon = function (days = 30) {
  if (!this.expiresAt) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return new Date() > this.expiresAt || new Date() > soon;
};

// Associations (to be defined elsewhere)
// DriverDocument.belongsTo(models.Driver, { foreignKey: 'driverId', onDelete: 'CASCADE' });
// DriverDocument.belongsTo(models.User, { foreignKey: 'reviewedBy', as: 'reviewer' });

module.exports = DriverDocument;