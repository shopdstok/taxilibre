const { Ride, User, Driver, Vehicle, Payment } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const AppError = require('../middleware/errorMiddleware').AppError;
const pricingService = require('../services/pricingService');
const matchingService = require('../services/matchingService');
const { Sequelize, Op } = require('sequelize');

// Vérification que les modèles sont bien importés
if (!Ride) throw new Error('Ride model is not defined. Check models/index.js export.');
if (!User) throw new Error('User model is not defined.');
if (!Driver) throw new Error('Driver model is not defined.');
if (!Vehicle) throw new Error('Vehicle model is not defined.');
if (!Payment) throw new Error('Payment model is not defined.');

/**
 * Request a ride
 */
const requestRide = async (req, res, next) => {
  try {
    const {
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      dropoffLatitude,
      dropoffLongitude,
      dropoffAddress,
      vehicleType = 'sedan',
      paymentMethod = 'card',
      notes
    } = req.body;

    const passengerId = req.userId;

    // Validate input
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDINATES');
    }

    // Request ride through matching service (handles ride creation and driver matching)
    const rideId = await matchingService.handleCreateRide(
      { lat: pickupLatitude, lng: pickupLongitude },
      { lat: dropoffLatitude, lng: dropoffLongitude },
      passengerId
    );

    // Fetch the created ride to return in response
    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger' }
      ]
    });

    if (!ride) {
      throw new AppError('Ride not found after creation', 404, 'RIDE_NOT_FOUND');
    }

    // Calculate distance and duration (for pricing and response)
    const distanceKm = calculateDistance(
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude
    );
    const durationMinutes = Math.ceil(distanceKm * 2); // Rough estimate

    // Calculate price
    const pricing = await pricingService.calculateRidePrice({
      distanceKm,
      durationMinutes,
      vehicleType,
      pickupLatitude,
      pickupLongitude,
      rideTime: new Date()
    });

    // Update ride with pricing information (since matching service doesn't handle pricing)
    await ride.update({
      estimatedDistance: distanceKm,
      estimatedDuration: durationMinutes,
      baseFare: pricing.basePricing.baseFare,
      pricePerKm: pricing.basePricing.pricePerKm,
      pricePerMinute: pricing.basePricing.pricePerMinute,
      totalPrice: pricing.finalPrice,
      paymentMethod,
      surgeMultiplier: pricing.surgeInfo?.multiplier || 1.0
    });

    // Refresh ride object with updated data
    await ride.reload();

    sendSuccess(res, {
      ride: ride.toJSON(),
      pricing
    }, 'Ride requested successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a ride
 */
const acceptRide = async (req, res, next) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driverId;

    // Accept ride through matching service (handles validation, database update, and notifications)
    await matchingService.handleAcceptRide({ rideId, driverId });

    // Fetch the updated ride and driver info to return in response
    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: Vehicle, as: 'vehicle' }
          ]
        }
      ]
    });

    if (!ride) {
      throw new AppError('Ride not found after acceptance', 404, 'RIDE_NOT_FOUND');
    }

    sendSuccess(res, {
      ride: ride.toJSON(),
      driver: ride.driver ? ride.driver.toJSON() : null
    }, 'Ride accepted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Start a ride
 */
const startRide = async (req, res, next) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driverId;

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED');
    }

    if (ride.status !== 'accepted') {
      throw new AppError('Ride cannot be started', 400, 'RIDE_CANNOT_START');
    }

    // Update ride
    await ride.update({
      status: 'ride_started',
      rideStartTime: new Date()
    });

    // Notify passenger
    const socketService = require('../services/socketService');
    socketService.sendRideStatusUpdate(rideId, 'started');

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride started successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a ride
 */
const completeRide = async (req, res, next) => {
  try {
    const { rideId, actualDistance, actualDuration, finalPrice } = req.body;
    const driverId = req.driverId;

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED');
    }

    if (ride.status !== 'ride_started') {
      throw new AppError('Ride cannot be completed', 400, 'RIDE_CANNOT_COMPLETE');
    }

    // Calculate final price if not provided
    const calculatedFinalPrice = finalPrice || ride.calculateActualPrice();

    // Update ride
    await ride.update({
      status: 'ride_completed',
      actualDistance: actualDistance || ride.estimatedDistance,
      actualDuration: actualDuration || ride.estimatedDuration,
      finalPrice: calculatedFinalPrice,
      rideEndTime: new Date()
    });

    // Update driver status and stats
    await Driver.update(
      {
        status: 'online',
        totalRides: Driver.sequelize.literal('totalRides + 1'),
        totalEarnings: Driver.sequelize.literal(`totalEarnings + ${calculatedFinalPrice * 0.85}`)
      },
      { where: { id: driverId } }
    );

    // Create payment record
    await Payment.create({
      rideId,
      amount: calculatedFinalPrice,
      paymentMethod: ride.paymentMethod,
      status: 'pending',
      platformFee: calculatedFinalPrice * 0.15,
      driverEarnings: calculatedFinalPrice * 0.85
    });

    // Notify passenger
    const socketService = require('../services/socketService');
    socketService.sendRideStatusUpdate(rideId, 'completed', {
      finalPrice: calculatedFinalPrice,
      actualDistance,
      actualDuration
    });

    sendSuccess(res, {
      ride: ride.toJSON(),
      finalPrice: calculatedFinalPrice
    }, 'Ride completed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a ride
 */
const cancelRide = async (req, res, next) => {
  try {
    const { rideId, reason } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    // Check if user can cancel this ride
    if (ride.passengerId !== userId && ride.driverId !== userId && userRole !== 'admin') {
      throw new AppError('You cannot cancel this ride', 403, 'CANNOT_CANCEL');
    }

    if (!ride.canBeCancelled()) {
      throw new AppError('Ride cannot be cancelled', 400, 'RIDE_CANNOT_CANCEL');
    }

    // Update ride
    await ride.update({
      status: 'cancelled',
      cancellationReason: reason,
      cancelledBy: userRole,
      cancellationTime: new Date()
    });

    // Update driver status if driver was assigned
    if (ride.driverId) {
      await Driver.update(
        { status: 'online' },
        { where: { id: ride.driverId } }
      );
    }

    // Notify other party
    const socketService = require('../services/socketService');
    socketService.sendRideStatusUpdate(rideId, 'cancelled', {
      reason,
      cancelledBy: userRole
    });

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride details
 */
const getRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: Vehicle, as: 'vehicle' }
          ]
        },
        { model: Vehicle, as: 'vehicle' },
        { model: Payment, as: 'payment' }
      ]
    });

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    // Check if user has access to this ride
    if (ride.passengerId !== userId && ride.driverId !== userId && userRole !== 'admin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user rides
 */
const getUserRides = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause = { passengerId: userId };
    if (status) {
      whereClause.status = status;
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: Vehicle, as: 'vehicle' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    sendSuccess(res, {
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    }, 'User rides retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Estimate ride price
 */
const estimateRide = async (req, res, next) => {
  try {
    const {
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      vehicleType = 'sedan'
    } = req.body;

    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDINATES');
    }

    // Calculate distance and duration
    const distanceKm = calculateDistance(
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude
    );
    const durationMinutes = Math.ceil(distanceKm * 2);

    // Calculate price
    const pricing = await pricingService.calculateRidePrice({
      distanceKm,
      durationMinutes,
      vehicleType,
      pickupLatitude,
      pickupLongitude,
      rideTime: new Date()
    });

    sendSuccess(res, {
      estimate: {
        distanceKm,
        durationMinutes,
        pricing,
        vehicleType
      }
    }, 'Ride estimate calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get driver's ride history
 */
const getDriverRideHistory = async (req, res, next) => {
  try {
    const driverId = req.userId;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { driverId };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: Vehicle, as: 'vehicle' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    sendSuccess(res, {
      rides: rows.map(ride => ({
        id: ride.id,
        passenger: {
          id: ride.passenger.id,
          name: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
          phone: ride.passenger.phone,
          email: ride.passenger.email
        },
        vehicle: ride.vehicle
          ? {
              id: ride.vehicle.id,
              make: ride.vehicle.make,
              model: ride.vehicle.model,
              year: ride.vehicle.year,
              color: ride.vehicle.color,
              licensePlate: ride.vehicle.licensePlate
            }
          : null,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        pickupLatitude: ride.pickupLatitude,
        pickupLongitude: ride.pickupLongitude,
        dropoffLatitude: ride.dropoffLatitude,
        dropoffLongitude: ride.dropoffLongitude,
        status: ride.status,
        fareAmount: ride.fareAmount,
        distanceKm: ride.distanceKm,
        durationMinutes: ride.durationMinutes,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    }, 'Driver ride history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver statistics
 */
const getDriverStats = async (req, res, next) => {
  try {
    const driverId = req.userId;

    // Get driver stats from rides
    const stats = await Ride.findAll({
      where: { driverId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRides'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completedRides'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'totalEarnings'],
        [Sequelize.fn('AVG', Sequelize.col('totalAmount')), 'averageFare'],
        [Sequelize.fn('SUM', Sequelize.col('distanceKm')), 'totalDistance'],
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']
      ],
      raw: true
    });

    // Get current month stats
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyStats = await Ride.findAll({
      where: {
        driverId,
        createdAt: {
          [Op.gte]: currentMonthStart
        }
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'monthlyRides'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'monthlyCompletedRides'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'monthlyEarnings']
      ],
      raw: true
    });

    sendSuccess(res, {
      totalRides: parseInt(stats[0].totalRides) || 0,
      completedRides: parseInt(stats[0].completedRides) || 0,
      totalEarnings: parseFloat(stats[0].totalEarnings) || 0,
      averageFare: parseFloat(stats[0].averageFare) || 0,
      totalDistance: parseFloat(stats[0].totalDistance) || 0,
      averageRating: parseFloat(stats[0].averageRating) || 0,
      monthlyRides: parseInt(monthlyStats[0].monthlyRides) || 0,
      monthlyCompletedRides: parseInt(monthlyStats[0].monthlyCompletedRides) || 0,
      monthlyEarnings: parseFloat(monthlyStats[0].monthlyEarnings) || 0
    }, 'Driver statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Rate a ride
 */
const rateRide = async (req, res, next) => {
  try {
    const rideId = req.params.rideId;
    const { rating, review } = req.body;
    const userId = req.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
    }

    // Find the ride and verify user is the passenger
    const ride = await Ride.findOne({
      where: { id: rideId },
      include: [{ model: User, as: 'passenger' }]
    });

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    if (ride.passengerId !== userId) {
      throw new AppError('Unauthorized to rate this ride', 403, 'UNAUTHORIZED');
    }

    if (ride.status !== 'completed') {
      throw new AppError('Can only rate completed rides', 400, 'RIDE_NOT_COMPLETED');
    }

    // Update the ride with rating and review
    await ride.update({ rating, review });

    sendSuccess(res, { rideId: ride.id, rating, review }, 'Ride rated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Report an issue with a ride
 */
const reportIssue = async (req, res, next) => {
  try {
    const rideId = req.params.rideId;
    const { issueType, description } = req.body;
    const userId = req.userId;

    // Validate issue type
    const validIssueTypes = ['safety', 'vehicle_condition', 'driver_behavior', 'route_issue', 'other'];
    if (!issueType || !validIssueTypes.includes(issueType)) {
      throw new AppError('Invalid issue type', 400, 'INVALID_ISSUE_TYPE');
    }

    // Find the ride and verify user is the passenger
    const ride = await Ride.findOne({
      where: { id: rideId },
      include: [{ model: User, as: 'passenger' }]
    });

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    if (ride.passengerId !== userId) {
      throw new AppError('Unauthorized to report issue for this ride', 403, 'UNAUTHORIZED');
    }

    // TODO: Save issue to database (would need a RideIssue model)
    // For now, we'll just acknowledge the report
    sendSuccess(res, { rideId: ride.id, issueType, description }, 'Issue reported successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Schedule a ride for future pickup
 */
const scheduleRide = async (req, res, next) => {
  try {
    const {
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      dropoffLatitude,
      dropoffLongitude,
      dropoffAddress,
      vehicleType = 'sedan',
      paymentMethod = 'card',
      scheduledTime,
      notes
    } = req.body;

    const passengerId = req.userId;

    // Validate input
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude || !scheduledTime) {
      throw new AppError('Pickup/dropoff coordinates and scheduled time are required', 400, 'MISSING_SCHEDULE_DATA');
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      throw new AppError('Scheduled time must be in the future', 400, 'INVALID_SCHEDULE_TIME');
    }

    // Create scheduled ride (status will be 'scheduled' initially)
    const scheduledRide = await Ride.create({
      passengerId,
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      dropoffLatitude,
      dropoffLongitude,
      dropoffAddress,
      vehicleType,
      paymentMethod,
      status: 'scheduled',
      scheduledAt: scheduledDate,
      notes
    });

    sendSuccess(res, { rideId: scheduledRide.id }, 'Ride scheduled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get scheduled rides for a user
 */
const getScheduledRides = async (req, res, next) => {
  try {
    const userId = req.userId;

    const scheduledRides = await Ride.findAll({
      where: {
        passengerId: userId,
        status: 'scheduled',
        scheduledAt: {
          [Op.gte]: new Date()
        }
      },
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: Vehicle, as: 'vehicle' }
      ],
      order: [['scheduledAt', 'ASC']]
    });

    sendSuccess(res, {
      scheduledRides: scheduledRides.map(ride => ({
        id: ride.id,
        passenger: {
          id: ride.passenger.id,
          name: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
          phone: ride.passenger.phone,
          email: ride.passenger.email
        },
        vehicle: ride.vehicle
          ? {
              id: ride.vehicle.id,
              make: ride.vehicle.make,
              model: ride.vehicle.model,
              year: ride.vehicle.year,
              color: ride.vehicle.color,
              licensePlate: ride.vehicle.licensePlate
            }
          : null,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        pickupLatitude: ride.pickupLatitude,
        pickupLongitude: ride.pickupLongitude,
        dropoffLatitude: ride.dropoffLatitude,
        dropoffLongitude: ride.dropoffLongitude,
        vehicleType: ride.vehicleType,
        paymentMethod: ride.paymentMethod,
        status: ride.status,
        scheduledAt: ride.scheduledAt,
        createdAt: ride.createdAt
      }))
    }, 'Scheduled rides retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a scheduled ride
 */
const cancelScheduledRide = async (req, res, next) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.userId;

    // Find the ride and verify user is the passenger
    const ride = await Ride.findOne({
      where: { id: rideId, passengerId: userId },
      include: [{ model: User, as: 'passenger' }]
    });

    if (!ride) {
      throw new AppError('Scheduled ride not found or unauthorized', 404, 'SCHEDULED_RIDE_NOT_FOUND');
    }

    if (ride.status !== 'scheduled') {
      throw new AppError('Can only cancel scheduled rides', 400, 'NOT_SCHEDULED');
    }

    // Update the ride status to cancelled
    await ride.update({ status: 'cancelled', cancelledAt: new Date() });

    sendSuccess(res, { rideId: ride.id }, 'Scheduled ride cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update ride status (for driver/admin)
 */
const updateRideStatus = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    // Validate status
    const allowedStatuses = ['accepted', 'in_progress', 'completed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      throw new AppError('Invalid status provided', 400, 'INVALID_STATUS');
    }

    // Find the ride
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND');
    }

    // Authorization: only the driver of the ride or an admin can update the status
    if (ride.driverId !== userId && userRole !== 'admin') {
      throw new AppError('Unauthorized to update this ride', 403, 'UNAUTHORIZED');
    }

    // Map status from API to database values
    const statusMap = {
      accepted: 'accepted',
      in_progress: 'ride_started',
      completed: 'ride_completed',
      cancelled: 'cancelled'
    };
    const dbStatus = statusMap[status];

    // Update the ride
    await ride.update({ status: dbStatus });

    // If the ride is completed, set the actual end time
    if (dbStatus === 'ride_completed') {
      await ride.update({ rideEndTime: new Date() });
    }

    // If the ride is cancelled, set the cancellation time and maybe release the driver
    if (dbStatus === 'cancelled') {
      await ride.update({ cancelledAt: new Date() });
      if (ride.driverId) {
        await Driver.update({ status: 'online' }, { where: { id: ride.driverId } });
      }
    }

    // Fetch the updated ride with associations for the response
    const updatedRide = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger' },
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: User, as: 'user' },
            { model: Vehicle, as: 'vehicle' }
          ]
        },
        { model: Vehicle, as: 'vehicle' },
        { model: Payment, as: 'payment' }
      ]
    });

    sendSuccess(res, {
      ride: updatedRide.toJSON()
    }, 'Ride status updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestRide,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  getRide,
  getUserRides,
  estimateRide,
  getDriverRideHistory,
  getDriverStats,
  rateRide,
  reportIssue,
  scheduleRide,
  getScheduledRides,
  cancelScheduledRide,
  updateRideStatus
};