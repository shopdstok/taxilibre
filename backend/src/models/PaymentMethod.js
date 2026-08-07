'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentMethod = sequelize.define('PaymentMethod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('card', 'bank_account', 'paypal', 'apple_pay', 'google_pay'),
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false
    // Examples: Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay, bank name
  },
  lastFour: {
    type: DataTypes.STRING(4),
    allowNull: false
    // Last 4 digits of card number or account number
  },
  expiryMonth: {
    type: DataTypes.INTEGER,
    allowNull: true
    // For card types only (1-12)
  },
  expiryYear: {
    type: DataTypes.INTEGER,
    allowNull: true
    // For card types only (4-digit year)
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'PaymentMethods',
  timestamps: true,
  indexes: [
    {
      name: 'payment_methods_user_id_index',
      fields: ['userId']
    },
    {
      name: 'payment_methods_default_index',
      fields: ['userId', 'isDefault'],
      where: {
        isDefault: true
      }
    }
  ]
});

// Define associations
PaymentMethod.associate = (models) => {
  PaymentMethod.belongsTo(models.User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
  });
};

module.exports = PaymentMethod;