const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Driver = sequelize.define('Driver', {
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
  status: {
    type: DataTypes.ENUM('offline', 'online', 'busy', 'inactive', 'suspended'),
    allowNull: false,
    defaultValue: 'offline'
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'document_required'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'verification_status'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalRides: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_rides'
  },
  totalEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'total_earnings'
  },
  currentLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    field: 'current_latitude',
    validate: {
      min: -90,
      max: 90
    }
  },
  currentLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    field: 'current_longitude',
    validate: {
      min: -180,
      max: 180
    }
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'license_number'
  },
  licenseExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'license_expiry'
  },
  insuranceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'insurance_number'
  },
  insuranceExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'insurance_expiry'
  },
  bankAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'bank_account_number'
  },
  bankRoutingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'bank_routing_number'
  },
  isBackgroundCheckPassed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_background_check_passed'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  lastLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_location_update'
  },
  lastStatusUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_status_update'
  },
  maxConcurrentRides: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'max_concurrent_rides',
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'drivers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['verification_status']
    },
    {
      fields: ['current_latitude', 'current_longitude']
    },
    {
      fields: ['rating']
    }
  ]
})

// Instance methods
Driver.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())

  // Remove sensitive banking information for non-admin responses
  if (values.bankAccountNumber) {
    values.bankAccountNumber = values.bankAccountNumber.replace(/.(?=.{4})/, '****')
  }

  return values
}

Driver.prototype.isOnline = function () {
  return this.status === 'online'
}

Driver.prototype.isAvailable = function () {
  return this.status === 'online' && this.verificationStatus === 'approved'
}

Driver.prototype.canAcceptRide = function () {
  return this.isAvailable() && this.totalRides < this.maxConcurrentRides
}

// Hooks
Driver.beforeCreate(async (driver) => {
  if (driver.licenseExpiry) {
    driver.licenseExpiry = new Date(driver.licenseExpiry)
  }
  if (driver.insuranceExpiry) {
    driver.insuranceExpiry = new Date(driver.insuranceExpiry)
  }
})

Driver.beforeUpdate(async (driver) => {
  if (driver.changed('licenseExpiry') && driver.licenseExpiry) {
    driver.licenseExpiry = new Date(driver.licenseExpiry)
  }
  if (driver.changed('insuranceExpiry') && driver.insuranceExpiry) {
    driver.insuranceExpiry = new Date(driver.insuranceExpiry)
  }
})

module.exports = Driver
