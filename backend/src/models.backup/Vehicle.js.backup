const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Vehicle = sequelize.define('Vehicle', {
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
    type: DataTypes.ENUM('sedan', 'suv', 'van', 'luxury', 'motorcycle', 'electric'),
    allowNull: false,
    defaultValue: 'sedan'
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50]
    }
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
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 30]
    }
  },
  plateNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'plate_number',
    validate: {
      len: [5, 15]
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'retired'),
    allowNull: false,
    defaultValue: 'active'
  },
  capacity: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: false,
    defaultValue: 4.0,
    validate: {
      min: 1,
      max: 8
    }
  },
  vin: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [17, 17]
    }
  },
  registrationExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'registration_expiry'
  },
  insurancePolicy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'insurance_policy'
  },
  insuranceExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'insurance_expiry'
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'photo_url',
    validate: {
      isUrl: true
    }
  },
  baseFare: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 2.50,
    field: 'base_fare',
    validate: {
      min: 0
    }
  },
  pricePerKm: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 1.50,
    field: 'price_per_km',
    validate: {
      min: 0
    }
  },
  pricePerMinute: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.25,
    field: 'price_per_minute',
    validate: {
      min: 0
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_verified'
  },
  verificationDocuments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    field: 'verification_documents'
  },
  lastInspectionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_inspection_date'
  },
  nextInspectionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'next_inspection_date'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  mileage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['plate_number']
    },
    {
      fields: ['driver_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['capacity']
    }
  ]
})

// Instance methods
Vehicle.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  return values
}

Vehicle.prototype.calculatePrice = function (distanceKm, durationMinutes) {
  const distancePrice = distanceKm * this.pricePerKm
  const durationPrice = durationMinutes * this.pricePerMinute
  return this.baseFare + distancePrice + durationPrice
}

Vehicle.prototype.isAvailable = function () {
  return this.status === 'active' && this.isVerified
}

Vehicle.prototype.getVehicleType = function () {
  const types = {
    sedan: 'Sedan',
    suv: 'SUV',
    van: 'Van',
    luxury: 'Luxury',
    motorcycle: 'Motorcycle',
    electric: 'Electric'
  }

  return types[this.type] || this.type
}

// Hooks
Vehicle.beforeCreate(async (vehicle) => {
  if (vehicle.registrationExpiry) {
    vehicle.registrationExpiry = new Date(vehicle.registrationExpiry)
  }
  if (vehicle.insuranceExpiry) {
    vehicle.insuranceExpiry = new Date(vehicle.insuranceExpiry)
  }
  if (vehicle.lastInspectionDate) {
    vehicle.lastInspectionDate = new Date(vehicle.lastInspectionDate)
  }
  if (vehicle.nextInspectionDate) {
    vehicle.nextInspectionDate = new Date(vehicle.nextInspectionDate)
  }
})

Vehicle.beforeUpdate(async (vehicle) => {
  const dateFields = [
    'registrationExpiry',
    'insuranceExpiry',
    'lastInspectionDate',
    'nextInspectionDate'
  ]

  dateFields.forEach(field => {
    if (vehicle.changed(field) && vehicle[field]) {
      vehicle[field] = new Date(vehicle[field])
    }
  })
})

module.exports = Vehicle
