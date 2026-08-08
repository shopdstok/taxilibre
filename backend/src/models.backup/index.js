'use strict';

const { sequelize } = require('../config/database')

const User = require('./User')
const Profile = require('./Profile')
const Driver = require('./Driver')
const Vehicle = require('./Vehicle')
const Ride = require('./Ride')
const Payment = require('./Payment')
const Rating = require('./Rating')
const Promotion = require('./Promotion')
const PricingZone = require('./PricingZone')
const UserMFA = require('./UserMFA')
const GeoZone = require('./GeoZone')
const PushSubscription = require('./PushSubscription')
const AuditLog = require('./AuditLog')
const RefreshToken = require('./RefreshToken')

// Définition des associations entre modèles
const defineAssociations = () => {
  // User ↔ Profile
  User.hasOne(Profile, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' })
  Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' })

  // User ↔ Driver
  User.hasOne(Driver, { foreignKey: 'userId', as: 'driver', onDelete: 'CASCADE' })
  Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' })

  // Driver ↔ Vehicle
  Driver.hasMany(Vehicle, { foreignKey: 'driverId', as: 'vehicles', onDelete: 'CASCADE' })
  Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' })

  // User (passenger) ↔ Ride
  User.hasMany(Ride, { foreignKey: 'passengerId', as: 'passengerRides', onDelete: 'CASCADE' })
  Ride.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' })

  // Driver ↔ Ride
  Driver.hasMany(Ride, { foreignKey: 'driverId', as: 'driverRides', onDelete: 'SET NULL' })
  Ride.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' })

  // Ride ↔ Payment
  Ride.hasOne(Payment, { foreignKey: 'rideId', as: 'payment', onDelete: 'CASCADE' })
  Payment.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' })

  // Ride ↔ Rating
  Ride.hasOne(Rating, { foreignKey: 'rideId', as: 'rating', onDelete: 'SET NULL' }) // one rating per ride
  Rating.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' })

  // User ↔ Rating (rater)
  User.hasMany(Rating, { foreignKey: 'fromUserId', as: 'ratingsGiven', onDelete: 'CASCADE' })
  Rating.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' })

  // User ↔ Rating (rated)
  User.hasMany(Rating, { foreignKey: 'toUserId', as: 'ratingsReceived', onDelete: 'CASCADE' })
  Rating.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' })

  // User ↔ RefreshToken
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' })
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Optional: PricingZone can be linked to Ride if needed; we leave for future
};

// Appliquer les associations
defineAssociations()

// Exporter tous les modèles et l'instance Sequelize
module.exports = {
  sequelize,

  // Status constants (updated to match new enums)
  RideStatus: {
    PENDING: 'PENDING',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    DRIVER_ARRIVED: 'DRIVER_ARRIVED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED_BY_PASSENGER: 'CANCELLED_BY_PASSENGER',
    CANCELLED_BY_DRIVER: 'CANCELLED_BY_DRIVER',
    NO_DRIVER_FOUND: 'NO_DRIVER_FOUND'
  },
  UserStatus: {
    ACTIVE: true,
    INACTIVE: false
  },
  UserRole: {
    PASSENGER: 'passenger',
    DRIVER: 'driver',
    ADMIN: 'admin',
    SUPPORT: 'support'
  },
  DriverStatus: {
    OFFLINE: 'OFFLINE',
    AVAILABLE: 'AVAILABLE',
    BUSY: 'BUSY',
    ON_RIDE: 'ON_RIDE'
  },
  VehicleType: {
    ECONOMY: 'ECONOMY',
    COMFORT: 'COMFORT',
    PREMIUM: 'PREMIUM',
    VAN: 'VAN',
    ACCESSIBLE: 'ACCESSIBLE'
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    AUTHORIZED: 'AUTHORIZED',
    CAPTURED: 'CAPTURED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
    DISPUTED: 'DISPUTED'
  },
  PaymentMethod: {
    CARD: 'CARD',
    CASH: 'CASH',
    WALLET: 'WALLET',
    PAYPAL: 'PAYPAL',
    APPLE_PAY: 'APPLE_PAY',
    GOOGLE_PAY: 'GOOGLE_PAY'
  },

  User,
  Profile,
  Driver,
  Vehicle,
  Ride,
  Payment,
  Rating,
  Promotion,
  PricingZone,
  RefreshToken,
  UserMFA,
  GeoZone,
  PushSubscription,
  AuditLog
}