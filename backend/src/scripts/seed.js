'use strict';

/**
 * Seeder Script: Populate TaxiLibre Database with Initial Data
 * Creates:
 *   - 1 admin user
 *   - 2 drivers with vehicles
 *   - 5 passengers
 *   - 3-4 rides of test (completed, cancelled, etc.)
 */

const path = require('path');
const { logger } = require('./services/loggingService');
const bcrypt = require('bcryptjs');

// Import dynamique pour éviter les erreurs circulaires
let sequelize;
let User, Driver, Vehicle, Ride, Payment, Rating, Promotion;

async function seed() {
  let transaction;
  
  try {
    // Import de la configuration de la base de données
    const dbConfig = require('../src/config/database');
    sequelize = dbConfig.sequelize;
    
    // Import des modèles
    User = require('../src/models/User');
    Driver = require('../src/models/Driver');
    Vehicle = require('../src/models/Vehicle');
    Ride = require('../src/models/Ride');
    Payment = require('../src/models/Payment');
    Rating = require('../src/models/Rating');
    Promotion = require('../src/models/Promotion');

    // Test de la connexion
    console.log('[SEEDER] Testing database connection...');
    await sequelize.authenticate();
    console.log('[SEEDER] ��� � � ✓ Database connection successful');

    // Commencer une transaction pour garantir l'atomicité
    transaction = await sequelize.transaction();
    console.log('[SEEDER] ��� � Transaction started');

    // 1. Créer l'admin
    console.log('[SEEDER] Creating admin user...');
    const adminPassword = await bcrypt.hash('AdminSecurePass123!', 12);
    const admin = await User.create({
      email: 'admin@taxilibre.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true
    }, { transaction });
    console.log('[SEEDER] Admin created: ' + admin.email);

    // 2. Créer les passagers
    console.log('[SEEDER] Creating passengers...');
    const passengers = [];
    for (let i = 1; i <= 5; i++) {
      const password = await bcrypt.hash(passengerpass, 12);
      const passenger = await User.create({
        email: 'passenger${i}@taxilibre.com',
        passwordHash: password,
        firstName: 'Passenger${i}',
        lastName: '${i}',
        phone: '+336000000',
        role: 'passenger',
        isVerified: true
      }, { transaction });
      passengers.push(passenger);
      console.log('[SEEDER] Passenger created: ' + passenger.email);
    }

    // 3. Créer les conducteurs avec véhicules
    console.log('[SEEDER] Creating drivers with vehicles...');
    const drivers = [];
    const vehicles = [];
    
    for (let i = 1; i <= 2; i++) {
      // Créer l'utilisateur conducteur
      const driverPassword = await bcrypt.hash(driverpass, 12);
      const driverUser = await User.create({
        email: 'driver${i}@taxilibre.com',
        passwordHash: driverPassword,
        firstName: 'Driver${i}',
        lastName: '${i}',
        phone: '+336000001',
        role: 'driver',
        isVerified: true
      }, { transaction });

      // Créer le profil conducteur
      const driver = await Driver.create({
        userId: driverUser.id,
        isAvailable: true,
        currentLat: 48.8566 + (i * 0.01), // Paris coordinates
        currentLng: 2.3522 + (i * 0.01),
        ratingAvg: 4.5 + (i * 0.1),
        ratingCount: 50 + (i * 10),
        documentsStatus: 'approved'
      }, { transaction });
      drivers.push({ user: driverUser, driver: driver });

      // Créer le véhicule associé
      const vehicle = await Vehicle.create({
        driverId: driver.id,
        brand: i === 1 ? 'Toyota' : 'Honda',
        model: i === 1 ? 'Prius' : 'Civic',
        color: i === 1 ? 'Blue' : 'Red',
        plateNumber: 'TAXI00${i}',
        year: 2020 + i,
        seats: 4,
        isApproved: true
      }, { transaction });
      vehicles.push(vehicle);
      
      console.log('[SEEDER] Driver and vehicle created: ' + driverUser.email);
    }

    // 4. Créer quelques promotions
    console.log('[SEEDER] Creating promotions...');
    const promotions = [];
    
    // Promotion 10% de réduction
    const promo1 = await Promotion.create({
      code: 'WELCOME10',
      type: 'percentage',
      value: 10.0,
      minPriceCents: 500, // 5.00€
      maxDiscountCents: 500, // 5.00€ max
      validFrom: new Date(Date.now() - 86400000), // Hier
      validTo: new Date(Date.now() + 86400000 * 30), // Dans 30 jours
      isActive: true
    }, { transaction });
    promotions.push(promo1);
    console.log('[SEEDER] Promotion created: ' + promo1.code);

    // Promotion 2€ de réduction
    const promo2 = await Promotion.create({
      code: 'SAVE2EURO',
      type: 'fixed',
      value: 2.0,
      minPriceCents: 1000, // 10.00€
      maxDiscountCents: 200, // 2.00€
      validFrom: new Date(Date.now() - 86400000), // Hier
      validTo: new Date(Date.now() + 86400000 * 60), // Dans 60 jours
      isActive: true
    }, { transaction });
    promotions.push(promo2);
    console.log('[SEEDER] Promotion created: ' + promo2.code);

    // 5. Créer des courses de test
    console.log('[SEEDER] Creating test rides...');
    const rides = [];
    
    // Course 1: Complétée
    const ride1 = await Ride.create({
      passengerId: passengers[0].id,
      driverId: drivers[0].driver.id,
      status: 'completed',
      originLat: 48.8566,
      originLng: 2.3522,
      destinationLat: 48.8606,
      destinationLng: 2.3376,
      distanceMeters: 1500, // 1.5 km
      durationSeconds: 300, // 5 minutes
      priceCents: 450, // 4.50€
      currency: 'EUR',
      paymentStatus: 'succeeded',
      startedAt: new Date(Date.now() - 86400000 * 2), // Il y a 2 jours
      completedAt: new Date(Date.now() - 86400000 * 2 + 300) // Il y a 2 jours + 5 min
    }, { transaction });
    rides.push(ride1);
    console.log('[SEEDER] Completed ride created: ' + ride1.id);

    // Créer le paiement pour la course 1
    await Payment.create({
      rideId: ride1.id,
      stripePaymentIntentId: 'pi_test_' + ride1.id,
      amountCents: 450,
      currency: 'EUR',
      status: 'succeeded'
    }, { transaction });
    console.log('[SEEDER] Payment created for completed ride: ' + ride1.id);

    // Créer une évaluation pour la course 1 (passenger -> driver)
    await Rating.create({
      rideId: ride1.id,
      fromUserId: passengers[0].id,
      toUserId: drivers[0].driver.userId,
      score: 5,
      comment: 'Excellent service, very professional driver!'
    }, { transaction });
    console.log('[SEEDER] Rating created for completed ride: ' + ride1.id);

    // Course 2: Annulée
    const ride2 = await Ride.create({
      passengerId: passengers[1].id,
      driverId: drivers[1].driver.id,
      status: 'cancelled',
      originLat: 48.8738,
      originLng: 2.2950,
      destinationLat: 48.8584,
      destinationLng: 2.2945,
      distanceMeters: 2100, // 2.1 km
      durationSeconds: 420, // 7 minutes
      priceCents: 630, // 6.30€
      currency: 'EUR',
      paymentStatus: 'pending',
      cancelledAt: new Date(Date.now() - 86400000) // Hier
    }, { transaction });
    rides.push(ride2);
    console.log('[SEEDER] Cancelled ride created: ' + ride2.id);

    // Course 3: En attente
    const ride3 = await Ride.create({
      passengerId: passengers[2].id,
      driverId: null, // Pas encore attribué
      status: 'requested',
      originLat: 48.8848,
      originLng: 2.3469,
      destinationLat: 48.8566,
      destinationLng: 2.3522,
      distanceMeters: 1800, // 1.8 km
      durationSeconds: 360, // 6 minutes
      priceCents: 540, // 5.40€
      currency: 'EUR',
      paymentStatus: 'pending'
    }, { transaction });
    rides.push(ride3);
    console.log('[SEEDER] Requested ride created: ' + ride3.id);

    // Valider la transaction
    await transaction.commit();
    console.log('[SEEDER] Transaction committed successfully');

    // Afficher le résumé
    console.log('\n[SEEDER] Seeding completed successfully!');
    console.log('[SEEDER] Summary:');
    console.log('[SEEDER]    • 1 admin user');
    console.log('[SEEDER]    • ' + passengers.length + ' passengers');
    console.log('[SEEDER]    • ' + drivers.length + ' drivers with vehicles');
    console.log('[SEEDER]    • ' + promotions.length + ' promotions');
    console.log('[SEEDER]    • ' + rides.length + ' rides');
    console.log('[SEEDER]    • 1 payment');
    console.log('[SEEDER]    • 1 rating');

    return true;
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    if (transaction) await transaction.rollback();
    console.error('[SEEDER] Seeding failed:', error.message);
    logger.error('[SEEDER] Seeding failed:', error);
    return false;
  }
}

// Exporter la fonction pour utilisation dans d'autres scripts
module.exports = seed;

// Exécution directe : node scripts/seed.js
if (require.main === module) {
  seed()
    .then(success => {
      if (success) {
        console.log('[SEEDER] Process completed');
        process.exit(0);
      } else {
        console.log('[SEEDER] Process completed with errors');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('[SEEDER] Fatal error:', err.message);
      process.exit(1);
    });
}
