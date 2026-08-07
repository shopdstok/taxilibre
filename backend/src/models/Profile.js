// Enhanced Profile Model - Matches Specifications
'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  avatarUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'avatar_url'
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth'
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'fr'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR'
  },
  // Passager specific fields
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 5.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rating_count'
  },
  // Emergency contact
  emergencyContactName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'emergency_contact_name'
  },
  emergencyContactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'emergency_contact_phone'
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
  tableName: 'profiles',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['userId'] },
    { fields: ['language'] },
    { fields: ['currency'] }
  ]
});

// Instance methods
Profile.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Get full name
Profile.prototype.getFullName = function () {
  return `${this.firstName} ${this.lastName}`.trim();
};

// Associations (to be defined elsewhere)
// Profile.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });

module.exports = Profile;