/**
 * Payment Controller tests
 */
// Set JWT secrets for testing before importing app
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
// Set up dummy Stripe key for testing before importing any modules that use stripe
process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890';

const request = require('supertest');
const app = require('../src/server');
const { sequelize } = require('../src/config/database');
const { Ride, User, Payment } = require('../src/models');

describe('Payment Controller', () => {
  let authToken;
  let testUser;
  let testRide;

  beforeAll(async () => {
    await sequelize.authenticate();
    // Sync database to ensure clean state
    await sequelize.sync({ force: true });

    // Set up dummy Stripe key for testing
    // (already set at top of file)

    // Create test user
    testUser = await User.create({
      email: 'payment_test@example.com',
      password: 'securePassword123', // Will be hashed by User model hooks
      name: 'Payment Test User',
      phone: '+1234567890',
      role: 'passenger'
    });

    // Create test ride
    testRide = await Ride.create({
      passengerId: testUser.id,
      pickupLatitude: 48.8566,
      pickupLongitude: 2.3522,
      dropoffLatitude: 48.8606,
      dropoffLongitude: 2.3376,
      pickupAddress: 'Eiffel Tower, Paris',
      dropoffAddress: 'Louvre Museum, Paris',
      estimatedDistance: 2.5,
      estimatedDuration: 20.0,
      baseFare: 2.5,
      pricePerKm: 1.5,
      pricePerMinute: 0.25,
      totalPrice: 25.50,
      status: 'ride_completed', // Must be completed to create payment
      paymentStatus: 'pending'
    });

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'payment_test@example.com',
        password: 'securePassword123' // We'll use this for login test
      })
      .expect(200);

    console.log('Login response body:', JSON.stringify(loginRes.body, null, 2));
    authToken = loginRes.body.data.tokens.accessToken;
    console.log('authToken:', authToken);
    console.log('Login response body:', JSON.stringify(loginRes.body, null, 2));
    console.log('Auth token:', authToken);
  });

  afterAll(async () => {
    // Cleanup
    await Payment.destroy({ where: {} });
    await Ride.destroy({ where: {} });
    await User.destroy({ where: {} });
    await sequelize.close();
  });

  describe('POST /api/v1/payments/create-intent', () => {
    it('should create payment intent for completed ride', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rideId: testRide.id,
          amount: 25.50
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('clientSecret');
      expect(res.body.data).toHaveProperty('paymentIntentId');
    });

    it('should return 400 for missing rideId or amount', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent ride', async () => {
      const res = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rideId: 99999,
          amount: 25.50
        })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/payments/confirm', () => {
    it('should confirm payment with valid intent ID', async () => {
      // First create a payment intent
      const createRes = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rideId: testRide.id,
          amount: 25.50
        })
        .expect(201);

      const paymentIntentId = createRes.body.data.paymentIntentId;

      // Then confirm it
      const res = await request(app)
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentIntentId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
    });
  });
});
