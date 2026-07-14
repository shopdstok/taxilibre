const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s-()]+$/
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'driver', 'passenger'),
    allowNull: false,
    defaultValue: 'passenger'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verified_at'
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'phone_verified_at'
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_customer_id'
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'google_id'
  },
  appleId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'apple_id'
  },
  facebookId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'facebook_id'
  },
  microsoftId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'microsoft_id'
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_password_token'
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires'
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['google_id']
    },
    {
      fields: ['apple_id']
    },
    {
      fields: ['facebook_id']
    },
    {
      fields: ['microsoft_id']
    }
  ]
})

// Instance methods
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())

  // Remove sensitive information
  delete values.password
  delete values.resetPasswordToken
  delete values.resetPasswordExpires

  return values
}

User.prototype.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(candidatePassword, this.password)
}

User.prototype.generatePasswordResetToken = function () {
  const crypto = require('crypto')
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.resetPasswordToken = resetToken
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  return resetToken
}

// Hooks
User.beforeCreate(async (user) => {
  const bcrypt = require('bcryptjs')
  const saltRounds = 12

  if (user.password) {
    user.password = await bcrypt.hash(user.password, saltRounds)
  }
})

User.beforeUpdate(async (user) => {
  const bcrypt = require('bcryptjs')

  if (user.changed('password')) {
    const saltRounds = 12
    user.password = await bcrypt.hash(user.password, saltRounds)
  }
})

module.exports = User
