/**
 * Authentication API tests
 */
const request = require('supertest');
const app = require('../src/server');

describe('Authentication Endpoints', () => {
  // Test user registration
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securePassword123',
          name: 'Test User',
          phone: '+1234567890',
          role: 'passenger'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com'
          // missing password, name, etc.
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // Test login
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create a user (if not exists) - in real test we'd use a test fixture
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securePassword123'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // Test logout
  describe('POST /api/v1/auth/logout', () => {
    it('should logout user', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securePassword123'
        });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // Test refresh token
  describe('POST /api/v1/auth/refresh-token', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      // Login to get tokens
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securePassword123'
        })
        .expect(200);

      accessToken = loginRes.body.data.accessToken;
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh access token using refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.accessToken).not.toEqual(accessToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 for missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
