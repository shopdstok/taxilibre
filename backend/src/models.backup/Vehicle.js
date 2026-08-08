'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'drivers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('ECONOMY', 'COMFORT', 'PREMIUM', 'VAN', 'ACCESSIBLE'),
    allowNull: false,
    field: 'vehicle_type'
  },
  brand: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1990,
      max: new Date().getFullYear() + 1
    }
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  licensePlate: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    field: 'license_plate'
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8
    }
  },
  isAccessible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_accessible'
  },
  registrationDocUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'registration_doc_url'
  },
  insuranceDocUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'insurance_doc_url'
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
  tableName: 'vehicles',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['licensePlate'] },
    { fields: ['driverId'] },
    { fields: ['type'] }
  ]
});

// Instance methods
Vehicle.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  return values;
};

// Associations (to be defined elsewhere)
// Vehicle.belongsTo(models.Driver, { foreignKey: 'driverId', onDelete: 'CASCADE' });

module.exports = Vehicle;