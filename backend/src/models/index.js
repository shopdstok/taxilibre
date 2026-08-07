// Enhanced Models Index - Defines Associations
'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const basename = path.basename(__filename);

const db = {};

// Import all model files
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file !== 'index.js'
    );
  })
  .forEach(file => {
    // Nouveau style : chaque fichier modele fait sequelize.define(...) au
    // top-level via la config shared et exporte la classe Model 직접
    // (self-init), pas una factory function. On require donc direttamente.
    const model = require(path.join(__dirname, file));
    if (model && model.name && !db[model.name]) {
      db[model.name] = model;
    }
  });

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Define all associations as per specifications

// User associations
db.User.hasMany(db.Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.User.hasMany(db.Ride, { foreignKey: 'passengerId', as: 'passengerRides', onDelete: 'SET NULL' });
db.User.hasMany(db.Ride, { foreignKey: 'driverId', as: 'driverRides', onDelete: 'SET NULL' });
db.User.hasMany(db.Payment, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.User.hasMany(db.Rating, { foreignKey: 'fromUserId', as: 'ratingsGiven', onDelete: 'CASCADE' });
db.User.hasMany(db.Rating, { foreignKey: 'toUserId', as: 'ratingsReceived', onDelete: 'CASCADE' });
db.User.hasMany(db.RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.User.hasMany(db.PromotionUsage, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.User.hasMany(db.Notification, { foreignKey: 'userId', onDelete: 'CASCADE' }); // Added
db.User.hasMany(db.PaymentMethod, { foreignKey: 'userId', onDelete: 'CASCADE' }); // Added

// Profile associations
db.Profile.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Driver associations
db.Driver.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Driver.hasMany(db.Vehicle, { foreignKey: 'driverId', onDelete: 'CASCADE' });
db.Driver.hasMany(db.Ride, { foreignKey: 'driverId', as: 'driverRides', onDelete: 'SET NULL' });
db.Driver.hasMany(db.Payment, { foreignKey: 'driverId', onDelete: 'CASCADE' });
db.Driver.hasMany(db.DriverDocument, { foreignKey: 'driverId', onDelete: 'CASCADE' });
db.Driver.hasMany(db.Rating, { foreignKey: 'toUserId', as: 'driverRatings', onDelete: 'CASCADE' }); // Drivers are rated by passengers

// Vehicle associations
db.Vehicle.belongsTo(db.Driver, { foreignKey: 'driverId', onDelete: 'CASCADE' });
db.Vehicle.hasMany(db.Ride, { foreignKey: 'vehicleId', onDelete: 'SET NULL' });

// DriverDocument associations
db.DriverDocument.belongsTo(db.Driver, { foreignKey: 'driverId', onDelete: 'CASCADE' });

// Ride associations
db.Ride.belongsTo(db.User, { foreignKey: 'passengerId', as: 'passenger', onDelete: 'SET NULL' });
db.Ride.belongsTo(db.User, { foreignKey: 'driverId', as: 'driver', onDelete: 'SET NULL' });
db.Ride.belongsTo(db.Vehicle, { foreignKey: 'vehicleId', onDelete: 'SET NULL' });
db.Ride.hasOne(db.Payment, { foreignKey: 'rideId', onDelete: 'CASCADE' });
db.Ride.hasOne(db.Rating, { foreignKey: 'rideId', onDelete: 'CASCADE' });
db.Ride.belongsTo(db.Promotion, { foreignKey: 'promoCode', targetKey: 'code', onDelete: 'SET NULL' });
db.Ride.belongsTo(db.PricingZone, { foreignKey: 'pickupZoneId', onDelete: 'SET NULL' });
db.Ride.belongsTo(db.PricingZone, { foreignKey: 'dropoffZoneId', onDelete: 'SET NULL' });

// Payment associations
db.Payment.belongsTo(db.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });
db.Payment.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' }); // Added for direct user reference

// PaymentMethod associations
db.PaymentMethod.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.User.hasMany(db.PaymentMethod, { foreignKey: 'userId', onDelete: 'CASCADE' }); // Added

// Rating associations
db.Rating.belongsTo(db.Ride, { foreignKey: 'rideId', onDelete: 'CASCADE' });
db.Rating.belongsTo(db.User, { foreignKey: 'fromUserId', as: 'rater', onDelete: 'CASCADE' });
db.Rating.belongsTo(db.User, { foreignKey: 'toUserId', as: 'ratedUser', onDelete: 'CASCADE' });
db.Rating.belongsTo(db.User, { foreignKey: 'reviewedBy', onDelete: 'SET NULL' }); // Moderator who reviewed

// Promotion associations
db.Promotion.hasMany(db.Ride, { foreignKey: 'promoCode', sourceKey: 'code', onDelete: 'SET NULL' });
// PromotionUsage would be a separate model for tracking individual uses

// PricingZone associations
db.PricingZone.hasMany(db.Ride, { foreignKey: 'pickupZoneId', onDelete: 'SET NULL' });
db.PricingZone.hasMany(db.Ride, { foreignKey: 'dropoffZoneId', onDelete: 'SET NULL' });

// RefreshToken associations
db.RefreshToken.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Notification associations
db.Notification.belongsTo(db.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Notification.belongsTo(db.Ride, { foreignKey: 'rideId', onDelete: 'SET NULL' });
db.Notification.belongsTo(db.Payment, { foreignKey: 'paymentId', onDelete: 'SET NULL' });
db.Notification.belongsTo(db.Promotion, { foreignKey: 'promotionId', onDelete: 'SET NULL' });

module.exports = db;