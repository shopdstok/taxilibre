/**
 * Ride Service tests
 */
const { sequelize } = require('../src/config/database');
const { Ride, User } = require('../src/models');

describe('Ride Service', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    // Use force: true in test environment to avoid SQLite alter table issues
    const syncOptions = { force: true };
    console.log('syncOptions:', syncOptions);
    try {
      await sequelize.sync(syncOptions);
    } catch (error) {
      console.error('Error during sync:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Ride Model', () => {
    it('should create a ride', async () => {
      // First create a user for testing
      const user = await User.create({
        email: 'ride_test@example.com',
        password: 'hashed_password_here', // In real test, use proper hashing
        name: 'Ride Test User',
        phone: '+1234567890',
        role: 'passenger'
      });

      const ride = await Ride.create({
        passengerId: user.id,
        pickupLatitude: 48.8566,
        pickupLongitude: 2.3522,
        dropoffLatitude: 48.8606,
        dropoffLongitude: 2.3376,
        pickupAddress: 'Eiffel Tower, Paris',
        dropoffAddress: 'Louvre Museum, Paris',
        estimatedDistance: 5.0, // in kilometers
        estimatedDuration: 15.0, // in minutes
        baseFare: 2.0,
        pricePerKm: 1.5,
        pricePerMinute: 0.25,
        status: 'requested'
      });

      expect(ride).toBeDefined();
      expect(ride.id).toBeDefined();
      expect(ride.passengerId).toBe(user.id);
      expect(ride.status).toBe('requested');

      // Cleanup
      await ride.destroy();
      await user.destroy();
    });

    it('should update ride status', async () => {
      const user = await User.create({
        email: 'ride_status_test@example.com',
        password: 'hashed_password_here',
        name: 'Ride Status Test User',
        phone: '+1234567890',
        role: 'passenger'
      });

      const ride = await Ride.create({
        passengerId: user.id,
        pickupLatitude: 48.8566,
        pickupLongitude: 2.3522,
        dropoffLatitude: 48.8606,
        dropoffLongitude: 2.3376,
        pickupAddress: 'Eiffel Tower, Paris',
        dropoffAddress: 'Louvre Museum, Paris',
        estimatedDistance: 5.0, // in kilometers
        estimatedDuration: 15.0, // in minutes
        baseFare: 2.0,
        pricePerKm: 1.5,
        pricePerMinute: 0.25,
        status: 'requested'
      });

      await ride.update({ status: 'accepted' });
      const updatedRide = await Ride.findByPk(ride.id);

      expect(updatedRide.status).toBe('accepted');

      // Cleanup
      await ride.destroy();
      await user.destroy();
    });
  });
});
