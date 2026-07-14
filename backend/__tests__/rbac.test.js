/**
 * RBAC (Role-Based Access Control) tests
 */
const request = require('supertest');
const app = require('../src/server');
const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');

describe('RBAC Endpoints', () => {
  let passengerToken;
  let driverToken;
  let adminToken;
  let passengerId;
  let driverId;
  let adminId;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    await sequelize.authenticate();
    const syncOptions = { force: true };
    await sequelize.sync(syncOptions);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.destroy({ where: {} });

    // Create passenger user
    const passenger = await User.create({
      email: 'passenger@test.com',
      password: testPassword,
      name: 'Passenger Test',
      phone: '+1234567890',
      role: 'passenger'
    });
    passengerId = passenger.id;

    // Create driver user
    const driver = await User.create({
      email: 'driver@test.com',
      password: testPassword,
      name: 'Driver Test',
      phone: '+1234567891',
      role: 'driver'
    });
    driverId = driver.id;

    // Create admin user
    const admin = await User.create({
      email: 'admin@test.com',
      password: testPassword,
      name: 'Admin Test',
      phone: '+1234567892',
      role: 'admin'
    });
    adminId = admin.id;

    // Login as passenger to get token
    const passengerLoginResp = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'passenger@test.com',
        password: testPassword
      })
      .expect(200);
    passengerToken = passengerLoginResp.body.data.accessToken;

    // Login as driver to get token
    const driverLoginResp = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'driver@test.com',
        password: testPassword
      })
      .expect(200);
    driverToken = driverLoginResp.body.data.accessToken;

    // Login as admin to get token
    const adminLoginResp = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: testPassword
      })
      .expect(200);
    adminToken = adminLoginResp.body.data.accessToken;
  });

  describe('Admin Routes', () => {
    it('should allow admin to access admin stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny passenger access to admin stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should deny driver access to admin stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Driver Routes', () => {
    it('should allow driver to update their own status', async () => {
      const res = await request(app)
        .put(`/api/v1/drivers/${driverId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'available' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow admin to update driver status', async () => {
      const res = await request(app)
        .put(`/api/v1/drivers/${driverId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'offline' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should deny passenger from updating driver status', async () => {
      const res = await request(app)
        .put(`/api/v1/drivers/${driverId}/status`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ status: 'available' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});
