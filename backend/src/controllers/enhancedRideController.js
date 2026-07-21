const { Ride, User, Driver, Vehicle, Review, Payment } = require('../models')
const { successResponse, errorResponse, AppError } = require('../middleware/errorMiddleware')
const { pricingService } = require('../services')
const { matchingService } = require('../services')
const { Op } = require('sequelize')
const sequelize = require('sequelize')

/**
 * Advanced ride controller with Uber/Bolt level features
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
      notes,
      promoCode = null,
      isScheduledRide = false,
      scheduledTime = null,
      passengerPreferences = {}
    } = req.body

    const passengerId = req.userId

    // Validate input
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDINATES')
    }

    // Get passenger information
    const passenger = await User.findByPk(passengerId, {
      attributes: ['id', 'name', 'rating', 'preferredLanguage', 'isPremium']
    })

    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND')
    }

    // Calculate distance and duration
    const distanceKm = matchingService.calculateDistance(
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude
    )
    const durationMinutes = Math.ceil(distanceKm * 2.5)

    // Calculate comprehensive pricing
    const pricing = await pricingService.calculateRidePrice({
      distanceKm,
      durationMinutes,
      vehicleType,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      rideTime: scheduledTime || new Date(),
      passengerId,
      isScheduledRide,
      promoCode
    })

    // Create ride with comprehensive data
    const ride = await Ride.create({
      passengerId,
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      dropoffLatitude,
      dropoffLongitude,
      dropoffAddress,
      vehicleType,
      distanceKm,
      estimatedDurationMinutes: durationMinutes,
      estimatedFare: pricing.totalPrice,
      pricingBreakdown: pricing,
      paymentMethod,
      notes,
      promoCode,
      isScheduledRide,
      scheduledTime,
      status: 'REQUESTED',
      preferences: passengerPreferences,
      requestTime: new Date()
    })

    // Find optimal drivers using advanced matching
    const optimalDrivers = await matchingService.findOptimalDrivers(
      pickupLatitude,
      pickupLongitude,
      {
        vehicleType,
        maxDrivers: 5,
        surgeMultiplier: pricing.surgeMultiplier,
        passengerRating: passenger.rating,
        preferredLanguage: passenger.preferredLanguage,
        isPremiumRide: passenger.isPremium
      }
    )

    // Send ride requests to top drivers
    if (optimalDrivers.length > 0) {
      const driverIds = optimalDrivers.map(d => d.driver.id)
      await matchingService.sendRideRequestToDrivers(ride, driverIds)

      // Update ride with driver candidates
      await ride.update({
        driverCandidates: driverIds,
        status: 'SEARCHING_DRIVER'
      })
    } else {
      // No drivers available
      await ride.update({
        status: 'NO_DRIVERS_AVAILABLE'
      })
    }

    return successResponse(res, 201, {
      ride: {
        id: ride.id,
        status: ride.status,
        pickup: {
          latitude: pickupLatitude,
          longitude: pickupLongitude,
          address: pickupAddress
        },
        dropoff: {
          latitude: dropoffLatitude,
          longitude: dropoffLongitude,
          address: dropoffAddress
        },
        pricing,
        vehicleType,
        estimatedArrival: optimalDrivers[0]?.estimatedArrival || null,
        driverCandidates: optimalDrivers.length
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Accept ride by driver
 */
const acceptRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.userId

    // Get ride
    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'name', 'rating', 'phone']
        }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.status !== 'SEARCHING_DRIVER') {
      throw new AppError('Ride is no longer available', 400, 'RIDE_NOT_AVAILABLE')
    }

    // Get driver information
    const driver = await Driver.findByPk(driverId, {
      include: [
        {
          model: Vehicle,
          as: 'vehicles',
          where: { isActive: true }
        }
      ]
    })

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    // Update ride with driver assignment
    await ride.update({
      driverId,
      status: 'ACCEPTED',
      acceptedTime: new Date(),
      driverInfo: {
        name: driver.user?.name,
        rating: driver.rating,
        vehicle: driver.vehicles[0] || null
      }
    })

    // Update driver status
    await driver.update({
      status: 'IN_RIDE',
      currentRideId: rideId
    })

    // Notify passenger via WebSocket
    const { getIO } = require('../socket')
    getIO().to(`passenger_${ride.passengerId}`).emit('ride_accepted', {
      rideId: ride.id,
      driver: {
        id: driver.id,
        name: driver.user?.name,
        rating: driver.rating,
        phone: driver.user?.phone,
        vehicle: driver.vehicles[0]
      },
      estimatedArrival: Math.ceil(ride.distanceKm * 2)
    })

    return successResponse(res, 200, {
      ride: {
        id: ride.id,
        status: 'ACCEPTED',
        passenger: ride.passenger,
        pickup: {
          latitude: ride.pickupLatitude,
          longitude: ride.pickupLongitude,
          address: ride.pickupAddress
        },
        dropoff: {
          latitude: ride.dropoffLatitude,
          longitude: ride.dropoffLongitude,
          address: ride.dropoffAddress
        },
        pricing: ride.pricingBreakdown
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Start ride
 */
const startRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.userId

    const ride = await Ride.findByPk(rideId)

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('Unauthorized to start this ride', 403, 'UNAUTHORIZED')
    }

    if (ride.status !== 'ACCEPTED') {
      throw new AppError('Ride cannot be started', 400, 'RIDE_CANNOT_START')
    }

    await ride.update({
      status: 'IN_PROGRESS',
      startTime: new Date()
    })

    // Notify passenger
    const { getIO } = require('../socket')
    getIO().to(`passenger_${ride.passengerId}`).emit('ride_started', {
      rideId: ride.id,
      startTime: ride.startTime
    })

    return successResponse(res, 200, {
      ride: {
        id: ride.id,
        status: 'IN_PROGRESS',
        startTime: ride.startTime
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Complete ride
 */
const completeRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.userId
    const { actualDistance, actualDuration, finalLatitude, finalLongitude } = req.body

    const ride = await Ride.findByPk(rideId)

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('Unauthorized to complete this ride', 403, 'UNAUTHORIZED')
    }

    if (ride.status !== 'IN_PROGRESS') {
      throw new AppError('Ride is not in progress', 400, 'RIDE_NOT_IN_PROGRESS')
    }

    // Calculate final price based on actuals
    const finalPricing = await pricingService.calculateRidePrice({
      distanceKm: actualDistance || ride.distanceKm,
      durationMinutes: actualDuration || ride.estimatedDurationMinutes,
      vehicleType: ride.vehicleType,
      pickupLatitude: ride.pickupLatitude,
      pickupLongitude: ride.pickupLongitude,
      dropoffLatitude: ride.dropoffLatitude,
      dropoffLongitude: ride.dropoffLongitude,
      rideTime: ride.startTime
    })

    // Update ride with completion data
    await ride.update({
      status: 'COMPLETED',
      endTime: new Date(),
      actualDistanceKm: actualDistance,
      actualDurationMinutes: actualDuration,
      finalFare: finalPricing.totalPrice,
      finalPricing,
      finalLatitude,
      finalLongitude
    })

    // Update driver status
    await Driver.update(
      {
        status: 'ONLINE',
        currentRideId: null,
        totalRides: sequelize.literal('total_rides + 1'),
        totalEarnings: sequelize.literal(`total_earnings + ${finalPricing.totalPrice}`)
      },
      { where: { id: driverId } }
    )

    // Process payment
    // This would integrate with Stripe in production
    const payment = await Payment.create({
      rideId: ride.id,
      passengerId: ride.passengerId,
      driverId,
      amount: finalPricing.totalPrice,
      currency: finalPricing.currency,
      status: 'COMPLETED',
      paymentMethod: ride.paymentMethod,
      processedAt: new Date()
    })

    // Notify passenger
    const { getIO } = require('../socket')
    getIO().to(`passenger_${ride.passengerId}`).emit('ride_completed', {
      rideId: ride.id,
      finalFare: finalPricing.totalPrice,
      payment
    })

    return successResponse(res, 200, {
      ride: {
        id: ride.id,
        status: 'COMPLETED',
        endTime: ride.endTime,
        finalFare: finalPricing.totalPrice,
        payment
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get ride details
 */
const getRideDetails = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const userId = req.userId
    const userRole = req.userRole

    const ride = await Ride.findByPk(rideId, {
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'name', 'email', 'phone', 'rating']
        },
        {
          model: Driver,
          as: 'driver',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone', 'rating']
            },
            {
              model: Vehicle,
              as: 'vehicles'
            }
          ]
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Check authorization
    if (userRole === 'passenger' && ride.passengerId !== userId) {
      throw new AppError('Unauthorized to view this ride', 403, 'UNAUTHORIZED')
    }
    if (userRole === 'driver' && ride.driverId !== userId) {
      throw new AppError('Unauthorized to view this ride', 403, 'UNAUTHORIZED')
    }

    return successResponse(res, 200, { ride })
  } catch (error) {
    next(error)
  }
}

/**
 * Get ride history
 */
const getRideHistory = async (req, res, next) => {
  try {
    const userId = req.userId
    const userRole = req.userRole
    const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query

    const whereClause = {}

    if (userRole === 'passenger') {
      whereClause.passengerId = userId
    } else if (userRole === 'driver') {
      whereClause.driverId = userId
    }

    if (status) {
      whereClause.status = status
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = new Date(dateTo)
      }
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: userRole === 'passenger' ? 'driver' : 'passenger',
          attributes: ['id', 'name', 'rating']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    return successResponse(res, 200, {
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Cancel ride
 */
const cancelRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const { reason } = req.body
    const userId = req.userId
    const userRole = req.userRole

    const ride = await Ride.findByPk(rideId)

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Check authorization
    if (userRole === 'passenger' && ride.passengerId !== userId) {
      throw new AppError('Unauthorized to cancel this ride', 403, 'UNAUTHORIZED')
    }
    if (userRole === 'driver' && ride.driverId !== userId) {
      throw new AppError('Unauthorized to cancel this ride', 403, 'UNAUTHORIZED')
    }

    // Check if ride can be cancelled
    if (!['REQUESTED', 'SEARCHING_DRIVER', 'ACCEPTED'].includes(ride.status)) {
      throw new AppError('Ride cannot be cancelled', 400, 'RIDE_CANNOT_CANCEL')
    }

    // Calculate cancellation fee
    let cancellationFee = 0
    if (ride.status === 'ACCEPTED' && userRole === 'passenger') {
      cancellationFee = Math.min(ride.estimatedFare * 0.1, 5.00) // 10% or €5 max
    }

    await ride.update({
      status: 'CANCELLED',
      cancelledBy: userRole,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancellationFee
    })

    // Update driver status if applicable
    if (ride.driverId && userRole === 'passenger') {
      await Driver.update(
        { status: 'ONLINE', currentRideId: null },
        { where: { id: ride.driverId } }
      )
    }

    // Notify other party
    const { getIO } = require('../socket')
    const notificationTarget = userRole === 'passenger' ? `driver_${ride.driverId}` : `passenger_${ride.passengerId}`
    getIO().to(notificationTarget).emit('ride_cancelled', {
      rideId: ride.id,
      cancelledBy: userRole,
      reason,
      cancellationFee
    })

    return successResponse(res, 200, {
      ride: {
        id: ride.id,
        status: 'CANCELLED',
        cancelledBy: userRole,
        cancellationFee
      }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  requestRide,
  acceptRide,
  startRide,
  completeRide,
  getRideDetails,
  getRideHistory,
  cancelRide
}
