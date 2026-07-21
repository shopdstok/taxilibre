const { sequelize } = require('../config/database');

const User = require('./User');
const Driver = require('./Driver');
const Vehicle = require('./Vehicle');
const Ride = require('./Ride');
const Payment = require('./Payment');
const Review = require('./Review');
const UserMFA = require('./UserMFA');
const GeoZone = require('./GeoZone');
const PushSubscription = require('./PushSubscription');
const AuditLog = require('./AuditLog');
const RefreshToken = require('./RefreshToken');

// Définition des associations entre modèles
const defineAssociations = () => {
  // User ↔ Driver
  User.hasOne(Driver, { foreignKey: 'userId', as: 'driver', onDelete: 'CASCADE' });
  Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Driver ↔ Vehicle
  Driver.hasMany(Vehicle, { foreignKey: 'driverId', as: 'vehicles', onDelete: 'CASCADE' });
  Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  // User (passenger) ↔ Ride
  User.hasMany(Ride, { foreignKey: 'passengerId', as: 'passengerRides', onDelete: 'CASCADE' });
  Ride.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' });

  // Driver ↔ Ride
  Driver.hasMany(Ride, { foreignKey: 'driverId', as: 'driverRides', onDelete: 'SET NULL' });
  Ride.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  // Vehicle ↔ Ride
  Vehicle.hasMany(Ride, { foreignKey: 'vehicleId', as: 'rides', onDelete: 'SET NULL' });
  Ride.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

  // Ride ↔ Payment
  Ride.hasOne(Payment, { foreignKey: 'rideId', as: 'payment', onDelete: 'CASCADE' });
  Payment.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

  // Ride ↔ Review
  Ride.hasOne(Review, { foreignKey: 'rideId', as: 'review', onDelete: 'CASCADE' });
  Review.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });

  // User ↔ Review (passenger)
  User.hasMany(Review, { foreignKey: 'passengerId', as: 'passengerReviews', onDelete: 'CASCADE' });
  Review.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' });

  // Driver ↔ Review
  Driver.hasMany(Review, { foreignKey: 'driverId', as: 'driverReviews', onDelete: 'CASCADE' });
  Review.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  // User ↔ Review (moderator)
  User.hasMany(Review, { foreignKey: 'moderatedBy', as: 'moderatedReviews', onDelete: 'SET NULL' });
  Review.belongsTo(User, { foreignKey: 'moderatedBy', as: 'moderator' });

  // User ↔ AuditLog (admin)
  User.hasMany(AuditLog, { foreignKey: 'adminId', as: 'adminAuditLogs', onDelete: 'SET NULL' });
  AuditLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

  // User ↔ AuditLog (user)
  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'userAuditLogs', onDelete: 'SET NULL' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // User ↔ RefreshToken
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

// Appliquer les associations
defineAssociations();

// Exporter tous les modèles et l'instance Sequelize
module.exports = {
  sequelize,

  // Status constants (used by matchingService, rideController, etc.)
  RideStatus: {
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
    DRIVER_ARRIVING: 'driver_arriving',
    DRIVER_ARRIVED: 'driver_arrived',
    RIDE_STARTED: 'ride_started',
    RIDE_COMPLETED: 'ride_completed',
    CANCELLED: 'cancelled',
    NO_DRIVER_AVAILABLE: 'no_driver_available',
    EXPIRED: 'expired'
  },

  User,
  RefreshToken,
  Driver,
  Vehicle,
  Ride,
  Payment,
  Review,
  UserMFA,
  GeoZone,
  PushSubscription,
  AuditLog,
};
