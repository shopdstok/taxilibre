const { User, Driver, Vehicle, Ride, Payment, Review, UserMFA, GeoZone, PushSubscription, AuditLog, RefreshToken } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('./loggingService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class DatabaseService {
  /**
   * User-related operations
   */
  async getUserById(id) {
    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_expires'] }
      });
      return { data: user ? user.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await User.findOne({
        where: { email },
        attributes: { exclude: ['reset_token', 'reset_expires'] }
      });
      return { data: user ? user.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      return { data: null, error: error.message };
    }
  }

  async getUsers(options = {}) {
    try {
      const { limit = 50, offset = 0, role, isActive } = options;
      const where = {};
      
      if (role) where.role = role;
      if (isActive !== undefined) where.is_active = isActive;
      
      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_expires'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
      
      return { 
        data: rows.map(user => user.get()), 
        count,
        error: null 
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      return { data: [], count: 0, error: error.message };
    }
  }

  async createUser(userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        const salt = await bcrypt.genSalt(12);
        userData.password_hash = await bcrypt.hash(userData.password, salt);
        delete userData.password;
      }
      
      const user = await User.create(userData);
      // Remove sensitive data from response
      const userDataResponse = user.get();
      delete userDataResponse.password_hash;
      delete userDataResponse.reset_token;
      delete userDataResponse.reset_expires;
      
      return { data: userDataResponse, error: null };
    } catch (error) {
      logger.error('Error creating user:', error);
      return { data: null, error: error.message };
    }
  }

  async updateUser(id, userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        const salt = await bcrypt.genSalt(12);
        userData.password_hash = await bcrypt.hash(userData.password, salt);
        delete userData.password;
      }
      
      const [updatedCount, updatedRows] = await User.update(userData, {
        where: { id },
        returning: true,
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_expires'] }
      });
      
      if (updatedCount === 0) {
        return { data: null, error: 'User not found' };
      }
      
      const userDataResponse = updatedRows[0].get();
      delete userDataResponse.password_hash;
      delete userDataResponse.reset_token;
      delete userDataResponse.reset_expires;
      
      return { data: userDataResponse, error: null };
    } catch (error) {
      logger.error('Error updating user:', error);
      return { data: null, error: error.message };
    }
  }

  async deleteUser(id) {
    try {
      const deletedCount = await User.destroy({ where: { id } });
      return { 
        success: deletedCount > 0, 
        error: deletedCount === 0 ? 'User not found' : null 
      };
    } catch (error) {
      logger.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auth-related operations
   */
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  async generateToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role
      };
      
      return jwt.sign(
        payload, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
    } catch (error) {
      logger.error('Error generating token:', error);
      throw error;
    }
  }

  /**
   * Driver-related operations
   */
  async getDriverByUserId(userId) {
    try {
      const driver = await Driver.findOne({ 
        where: { user_id: userId },
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }]
      });
      return { data: driver ? driver.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching driver by user ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getDriverById(id) {
    try {
      const driver = await Driver.findByPk(id, {
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }]
      });
      return { data: driver ? driver.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching driver by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getDrivers(options = {}) {
    try {
      const { limit = 50, offset = 0, isAvailable } = options;
      const where = {};
      
      if (isAvailable !== undefined) where.is_available = isAvailable;
      
      const { count, rows } = await Driver.findAndCountAll({
        where,
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
      
      return { 
        data: rows.map(driver => driver.get()), 
        count,
        error: null 
      };
    } catch (error) {
      logger.error('Error fetching drivers:', error);
      return { data: [], count: 0, error: error.message };
    }
  }

  async createDriver(driverData) {
    try {
      const driver = await Driver.create(driverData);
      return { data: driver.get(), error: null };
    } catch (error) {
      logger.error('Error creating driver:', error);
      return { data: null, error: error.message };
    }
  }

  async updateDriver(id, driverData) {
    try {
      const [updatedCount, updatedRows] = await Driver.update(driverData, {
        where: { id },
        returning: true
      });
      
      if (updatedCount === 0) {
        return { data: null, error: 'Driver not found' };
      }
      
      return { data: updatedRows[0].get(), error: null };
    } catch (error) {
      logger.error('Error updating driver:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Ride-related operations
   */
  async getRideById(id) {
    try {
      const ride = await Ride.findByPk(id, {
        include: [
          { model: User, as: 'passenger', attributes: { exclude: ['password_hash'] } },
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }] },
          { model: Vehicle, as: 'vehicle' }
        ]
      });
      return { data: ride ? ride.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching ride by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getRides(options = {}) {
    try {
      const { limit = 50, offset = 0, status, passengerId, driverId } = options;
      const where = {};
      
      if (status) where.status = status;
      if (passengerId) where.passenger_id = passengerId;
      if (driverId) where.driver_id = driverId;
      
      const { count, rows } = await Ride.findAndCountAll({
        where,
        include: [
          { model: User, as: 'passenger', attributes: { exclude: ['password_hash'] } },
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }] },
          { model: Vehicle, as: 'vehicle' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
      
      return { 
        data: rows.map(ride => ride.get()), 
        count,
        error: null 
      };
    } catch (error) {
      logger.error('Error fetching rides:', error);
      return { data: [], count: 0, error: error.message };
    }
  }

  async createRide(rideData) {
    try {
      const ride = await Ride.create(rideData);
      return { data: ride.get(), error: null };
    } catch (error) {
      logger.error('Error creating ride:', error);
      return { data: null, error: error.message };
    }
  }

  async updateRide(id, rideData) {
    try {
      const [updatedCount, updatedRows] = await Ride.update(rideData, {
        where: { id },
        returning: true
      });
      
      if (updatedCount === 0) {
        return { data: null, error: 'Ride not found' };
      }
      
      return { data: updatedRows[0].get(), error: null };
    } catch (error) {
      logger.error('Error updating ride:', error);
      return { data: null, error: error.message };
    }
  }

  async deleteRide(id) {
    try {
      const deletedCount = await Ride.destroy({ where: { id } });
      return { 
        success: deletedCount > 0, 
        error: deletedCount === 0 ? 'Ride not found' : null 
      };
    } catch (error) {
      logger.error('Error deleting ride:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Payment-related operations
   */
  async getPaymentById(id) {
    try {
      const payment = await Payment.findByPk(id);
      return { data: payment ? payment.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching payment by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getPaymentsByRideId(rideId) {
    try {
      const payments = await Payment.findAll({ 
        where: { ride_id: rideId },
        order: [['created_at', 'DESC']]
      });
      return { data: payments.map(p => p.get()), error: null };
    } catch (error) {
      logger.error('Error fetching payments by ride ID:', error);
      return { data: [], error: error.message };
    }
  }

  async createPayment(paymentData) {
    try {
      const payment = await Payment.create(paymentData);
      return { data: payment.get(), error: null };
    } catch (error) {
      logger.error('Error creating payment:', error);
      return { data: null, error: error.message };
    }
  }

  async updatePayment(id, paymentData) {
    try {
      const [updatedCount, updatedRows] = await Payment.update(paymentData, {
        where: { id },
        returning: true
      });
      
      if (updatedCount === 0) {
        return { data: null, error: 'Payment not found' };
      }
      
      return { data: updatedRows[0].get(), error: null };
    } catch (error) {
      logger.error('Error updating payment:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Vehicle-related operations
   */
  async getVehicleById(id) {
    try {
      const vehicle = await Vehicle.findByPk(id);
      return { data: vehicle ? vehicle.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching vehicle by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getVehiclesByDriverId(driverId) {
    try {
      const vehicles = await Vehicle.findAll({ 
        where: { driver_id: driverId },
        order: [['created_at', 'DESC']]
      });
      return { data: vehicles.map(v => v.get()), error: null };
    } catch (error) {
      logger.error('Error fetching vehicles by driver ID:', error);
      return { data: [], error: error.message };
    }
  }

  async createVehicle(vehicleData) {
    try {
      const vehicle = await Vehicle.create(vehicleData);
      return { data: vehicle.get(), error: null };
    } catch (error) {
      logger.error('Error creating vehicle:', error);
      return { data: null, error: error.message };
    }
  }

  async updateVehicle(id, vehicleData) {
    try {
      const [updatedCount, updatedRows] = await Vehicle.update(vehicleData, {
        where: { id },
        returning: true
      });
      
      if (updatedCount === 0) {
        return { data: null, error: 'Vehicle not found' };
      }
      
      return { data: updatedRows[0].get(), error: null };
    } catch (error) {
      logger.error('Error updating vehicle:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Review-related operations
   */
  async getReviewById(id) {
    try {
      const review = await Review.findByPk(id, {
        include: [
          { model: User, as: 'passenger', attributes: { exclude: ['password_hash'] } },
          { model: User, as: 'driver', attributes: { exclude: ['password_hash'] } }
        ]
      });
      return { data: review ? review.get() : null, error: null };
    } catch (error) {
      logger.error('Error fetching review by ID:', error);
      return { data: null, error: error.message };
    }
  }

  async getReviewsByRideId(rideId) {
    try {
      const reviews = await Review.findAll({ 
        where: { ride_id: rideId },
        include: [
          { model: User, as: 'passenger', attributes: { exclude: ['password_hash'] } },
          { model: User, as: 'driver', attributes: { exclude: ['password_hash'] } }
        ]
      });
      return { data: reviews.map(r => r.get()), error: null };
    } catch (error) {
      logger.error('Error fetching reviews by ride ID:', error);
      return { data: [], error: error.message };
    }
  }

  async createReview(reviewData) {
    try {
      const review = await Review.create(reviewData);
      return { data: review.get(), error: null };
    } catch (error) {
      logger.error('Error creating review:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Audit log operations
   */
  async createAuditLog(auditData) {
    try {
      const auditLog = await AuditLog.create(auditData);
      return { data: auditLog.get(), error: null };
    } catch (error) {
      logger.error('Error creating audit log:', error);
      return { data: null, error: error.message };
    }
  }

  async getAuditLogs(options = {}) {
    try {
      const { limit = 100, offset = 0, userId, adminId, action, entityType } = options;
      const where = {};
      
      if (userId) where.user_id = userId;
      if (adminId) where.admin_id = adminId;
      if (action) where.action = action;
      if (entityType) where.entity_type = entityType;
      
      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', attributes: { exclude: ['password_hash'] } },
          { model: User, as: 'admin', attributes: { exclude: ['password_hash'] } }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
      
      return { 
        data: rows.map(log => log.get()), 
        count,
        error: null 
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      return { data: [], count: 0, error: error.message };
    }
  }

  /**
   * Refresh token operations
   */
  async createRefreshToken(tokenData) {
    try {
      const refreshToken = await RefreshToken.create(tokenData);
      return { data: refreshToken.get(), error: null };
    } catch (error) {
      logger.error('Error creating refresh token:', error);
      return { data: null, error: error.message };
    }
  }

  async findRefreshToken(token) {
    try {
      const refreshToken = await RefreshToken.findOne({ 
        where: { token },
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }]
      });
      return { data: refreshToken ? refreshToken.get() : null, error: null };
    } catch (error) {
      logger.error('Error finding refresh token:', error);
      return { data: null, error: error.message };
    }
  }

  async revokeRefreshToken(token) {
    try {
      const updatedCount = await RefreshToken.update(
        { revoked: true }, 
        { where: { token } }
      );
      return { success: updatedCount > 0, error: null };
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * User session operations (for JWT-based auth alternative)
   */
  async createSession(sessionData) {
    try {
      const session = await UserSession.create(sessionData);
      return { data: session.get(), error: null };
    } catch (error) {
      logger.error('Error creating user session:', error);
      return { data: null, error: error.message };
    }
  }

  async findSessionByToken(tokenHash) {
    try {
      const session = await UserSession.findOne({ 
        where: { token_hash: tokenHash },
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }]
      });
      return { data: session ? session.get() : null, error: null };
    } catch (error) {
      logger.error('Error finding session by token:', error);
      return { data: null, error: error.message };
    }
  }

  async invalidateSession(id) {
    try {
      const deletedCount = await UserSession.destroy({ where: { id } });
      return { success: deletedCount > 0, error: null };
    } catch (error) {
      logger.error('Error invalidating session:', error);
      return { success: false, error: error.message };
    }
  }

  async invalidateUserSessions(userId) {
    try {
      const deletedCount = await UserSession.destroy({ where: { user_id: userId } });
      return { success: deletedCount > 0, count: deletedCount, error: null };
    } catch (error) {
      logger.error('Error invalidating user sessions:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize UserSession model (if not already in models)
try {
  const { UserSession } = require('../models');
} catch (error) {
  // UserSession model might not exist yet, we'll handle it gracefully
  // In a real implementation, we would ensure the model exists
}

module.exports = new DatabaseService();