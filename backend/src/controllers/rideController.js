const { Ride, User, Driver, Vehicle, Payment, Rating, Promotion, PricingZone, RideStatus, UserRole, DriverStatus, VehicleType, PaymentStatus, PaymentMethod } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError
const pricingService = require('../services/pricingService')
const matchingService = require('../services/matchingService')
const { Sequelize, Op } = require('sequelize')

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
      vehicleType = VehicleType.ECONOMY,
      paymentMethod = PaymentMethod.CARD,
      notes,
      promoCode
    } = req.body

    const passengerId = req.userId

    // Validate input
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDINATES')
    }

    // Validate vehicleType
    if (!Object.values(VehicleType).includes(vehicleType)) {
      throw new AppError('Invalid vehicle type', 400, 'INVALID_VEHICLE_TYPE')
    }

    // Validate paymentMethod
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD')
    }

    // Calculate distance, duration and pricing first
    const distanceKm = calculateDistance(
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude
    )
    const durationMinutes = Math.ceil(distanceKm * 2)

    // Calculate pricing with potential surge and promotions
    const pricing = await pricingService.calculateRidePrice({
      distanceKm,
      durationMinutes,
      vehicleType,
      pickupLatitude,
      pickupLongitude,
      rideTime: new Date(),
      promoCode
    })

    // Request ride through matching service with full ride options
    const rideId = await matchingService.handleCreateRide(
      { lat: pickupLatitude, lng: pickupLongitude },
      { lat: dropoffLatitude, lng: dropoffLongitude },
      passengerId,
      {
        pickupAddress: pickupAddress || `${pickupLatitude}, ${pickupLongitude}`,
        dropoffAddress: dropoffAddress || `${dropoffLatitude}, ${dropoffLongitude}`,
        estimatedDistance: distanceKm,
        estimatedDuration: durationMinutes,
        baseFare: pricing.baseFare,
        distanceFare: pricing.distanceFare,
        timeFare: pricing.timeFare,
        surgeMultiplier: pricing.surgeMultiplier,
        subtotal: pricing.subtotal,
        serviceFee: pricing.serviceFee,
        tip: pricing.tip || 0,
        totalFare: pricing.totalFare,
        driverEarnings: pricing.driverEarnings,
        paymentMethod: paymentMethod,
        vehicleType,
        notes
      }
    )

    // Fetch the created ride to return in response
    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found after creation', 404, 'RIDE_NOT_FOUND')
    }

    sendSuccess(res, {
      ride: ride.toJSON(),
      pricing
    }, 'Ride requested successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * Accept a ride
 */
const acceptRide = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const driverId = req.driverId

    if (!rideId) {
      throw new AppError('Ride ID is required', 400, 'MISSING_RIDE_ID')
    }

    // Accept ride through matching service (handles validation, database update, and notifications)
    await matchingService.handleAcceptRide({ rideId, driverId })

    // Fetch the updated ride and driver info to return in response
    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount', 'totalRides'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'brand', 'model', 'year', 'color', 'licensePlate', 'vehicleType'] }
          ]
        }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found after acceptance', 404, 'RIDE_NOT_FOUND')
    }

    sendSuccess(res, {
      ride: ride.toJSON(),
      driver: ride.driver ? ride.driver.toJSON() : null
    }, 'Ride accepted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Driver arrived at pickup location
 */
const driverArrived = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const driverId = req.driverId

    if (!rideId) {
      throw new AppError('Ride ID is required', 400, 'MISSING_RIDE_ID')
    }

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.DRIVER_ASSIGNED) {
      throw new AppError('Ride cannot be marked as arrived', 400, 'RIDE_CANNOT_ARRIVE')
    }

    // Update ride
    await ride.update({
      status: RideStatus.DRIVER_ARRIVED,
      driverArrivedAt: new Date()
    })

    // Notify passenger
    const socketService = require('../services/socketService')
    socketService.sendRideStatusUpdate(rideId, 'driver_arrived')

    // Refresh ride object
    await ride.reload()

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Driver arrived successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Start a ride
 */
const startRide = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const driverId = req.driverId

    if (!rideId) {
      throw new AppError('Ride ID is required', 400, 'MISSING_RIDE_ID')
    }

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.DRIVER_ARRIVED) {
      throw new AppError('Ride cannot be started', 400, 'RIDE_CANNOT_START')
    }

    // Update ride
    await ride.update({
      status: RideStatus.IN_PROGRESS,
      startedAt: new Date()
    })

    // Notify passenger
    const socketService = require('../services/socketService')
    socketService.sendRideStatusUpdate(rideId, 'started')

    // Refresh ride object
    await ride.reload()

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride started successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Complete a ride
 */
const completeRide = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const { actualDistance, actualDuration, tipAmount } = req.body
    const driverId = req.driverId

    if (!rideId) {
      throw new AppError('Ride ID is required', 400, 'MISSING_RIDE_ID')
    }

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new AppError('Ride cannot be completed', 400, 'RIDE_CANNOT_COMPLETE')
    }

    // Calculate final price components
    const baseFare = ride.baseFare
    const distanceFare = ride.distanceFare
    const timeFare = ride.timeFare
    const surgeMultiplier = ride.surgeMultiplier
    const subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier
    const serviceFee = subtotal * 0.2 // 20% service fee
    const tip = tipAmount || 0
    const totalFare = subtotal + serviceFee + tip
    const driverEarnings = subtotal + tip // Driver gets base fare + tip, minus service fee goes to platform

    // Update ride
    await ride.update({
      status: RideStatus.COMPLETED,
      actualDistance: actualDistance || ride.estimatedDistance,
      actualDuration: actualDuration || ride.estimatedDuration,
      tip: tipAmount,
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier,
      subtotal,
      serviceFee,
      totalFare,
      driverEarnings,
      completedAt: new Date()
    })

    // Update driver status and stats
    await Driver.update(
      {
        status: DriverStatus.AVAILABLE,
        totalRides: Sequelize.literal('totalRides + 1'),
        ratingCount: Sequelize.literal('ratingCount + 1'), // Will be updated when rating is given
        // Earnings will be updated when payment is processed
      },
      { where: { id: driverId } }
    )

    // Create payment record (pending until payment is processed)
    await Payment.create({
      rideId,
      amount: totalFare,
      paymentMethod: ride.paymentMethod,
      status: PaymentStatus.PENDING,
      platformFee: ride.serviceFee,
      driverEarnings: ride.driverEarnings
    })

    // Notify passenger via socket
    const socketService = require('../services/socketService')
    socketService.sendRideStatusUpdate(rideId, 'completed', {
      totalFare: ride.totalFare,
      driverEarnings: ride.driverEarnings,
      tip: ride.tip
    })
    socketService.removeActiveRide(rideId)

    // Refresh ride object
    await ride.reload()

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride completed successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Cancel a ride
 */
const cancelRide = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const { reason } = req.body
    const userId = req.userId
    const userRole = req.userRole

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Check if user can cancel this ride
    if (ride.passengerId !== userId && ride.driverId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('You cannot cancel this ride', 403, 'CANNOT_CANCEL')
    }

    // Check if ride can be cancelled based on status
    const cancellableStatuses = [
      RideStatus.PENDING,
      RideStatus.DRIVER_ASSIGNED,
      RideStatus.DRIVER_ARRIVED,
      RideStatus.IN_PROGRESS
    ]
    if (!cancellableStatuses.includes(ride.status)) {
      throw new AppError('Ride cannot be cancelled at this stage', 400, 'RIDE_CANNOT_CANCEL')
    }

    // Determine who cancelled
    let cancelledBy
    if (ride.passengerId === userId) {
      cancelledBy = 'passenger'
    } else if (ride.driverId === userId) {
      cancelledBy = 'driver'
    } else if (userRole === UserRole.ADMIN) {
      cancelledBy = 'admin'
    }

    // Update ride
    await ride.update({
      status: cancelledBy === 'passenger' ? RideStatus.CANCELLED_BY_PASSENGER : 
              cancelledBy === 'driver' ? RideStatus.CANCELLED_BY_DRIVER : 
              RideStatus.CANCELLED_BY_PASSENGER, // Admin cancellation treated as passenger cancellation for now
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: new Date()
    })

    // Update driver status if driver was assigned and not already offline
    if (ride.driverId && ride.status !== RideStatus.OFFLINE) {
      await Driver.update(
        { status: DriverStatus.AVAILABLE },
        { where: { id: ride.driverId } }
      )
    }

    // Notify other party via socket
    const socketService = require('../services/socketService')
    socketService.sendRideStatusUpdate(rideId, 'cancelled', {
      reason,
      cancelledBy
    })
    socketService.removeActiveRide(rideId)

    // Refresh ride object
    await ride.reload()

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride cancelled successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get ride details
 */
const getRide = async (req, res, next) => {
  try {
    const rideId = req.params.id
    const userId = req.userId
    const userRole = req.userRole

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount', 'totalRides'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'brand', 'model', 'year', 'color', 'licensePlate', 'vehicleType'] }
          ]
        },
        { model: Vehicle, as: 'vehicle' },
        { model: Payment, as: 'payment' },
        { model: Rating, as: 'rating' }
      ]
    })

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    // Check if user has access to this ride
    if (ride.passengerId !== userId && ride.driverId !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED')
    }

    sendSuccess(res, {
      ride: ride.toJSON()
    }, 'Ride details retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get user rides
 */
const getUserRides = async (req, res, next) => {
  try {
    const userId = req.userId
    const { status, page = 1, limit = 10 } = req.query

    const whereClause = { passengerId: userId }
    if (status) {
      whereClause.status = status
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount', 'totalRides'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'brand', 'model', 'year', 'color', 'licensePlate', 'vehicleType'] }
          ]
        }
      ],
      order: [['requestedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    }, 'User rides retrieved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver rides
 */
const getDriverRides = async (req, res, next) => {
  try {
    const userId = req.userId
    const { status, page = 1, limit = 10 } = req.query

    const whereClause = { driverId: userId }
    if (status) {
      whereClause.status = status
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'rating', 'ratingCount', 'totalRides'],
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'brand', 'model', 'year', 'color', 'licensePlate', 'vehicleType'] }
          ]
        }
      ],
      order: [['requestedAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    })

    sendSuccess(res, {
      rides: rides.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rides.count,
        pages: Math.ceil(rides.count / parseInt(limit))
      }
    }, 'Driver rides retrieved successfully')
  } catch (error) {
    next(error)
  }
}

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
      vehicleType = VehicleType.ECONOMY
    } = req.body

    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDINATES')
    }

    // Validate vehicleType
    if (!Object.values(VehicleType).includes(vehicleType)) {
      throw new AppError('Invalid vehicle type', 400, 'INVALID_VEHICLE_TYPE')
    }

    // Calculate distance and duration
    const distanceKm = calculateDistance(
      pickupLatitude, pickupLongitude,
      dropoffLatitude, dropoffLongitude
    )
    const durationMinutes = Math.ceil(distanceKm * 2)

    // Calculate price
    const pricing = await pricingService.calculateRidePrice({
      distanceKm,
      durationMinutes,
      vehicleType,
      pickupLatitude,
      pickupLongitude,
      rideTime: new Date()
    })

    sendSuccess(res, {
      estimate: {
        distanceKm,
        durationMinutes,
        vehicleType,
        baseFare: pricing.baseFare,
        distanceFare: pricing.distanceFare,
        timeFare: pricing.timeFare,
        surgeMultiplier: pricing.surgeMultiplier,
        subtotal: pricing.subtotal,
        serviceFee: pricing.serviceFee,
        tip: 0,
        totalFare: pricing.totalFare,
        driverEarnings: pricing.driverEarnings
      }
    }, 'Ride estimate calculated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance (lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Rate a ride
 */
const rateRide = async (req, res, next) => {
  try {
    const rideId = req.params.rideId
    const { rating, review } = req.body
    const userId = req.userId

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING')
    }

    // Find the ride and verify user is the passenger
    const ride = await Ride.findOne({
      where: { id: rideId },
      include: [{ model: User, as: 'passenger' }]
    })

    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.passengerId !== userId) {
      throw new AppError('Unauthorized to rate this ride', 403, 'UNAUTHORIZED')
    }

    if (ride.status !== RideStatus.COMPLETED) {
      throw new AppError('Can only rate completed rides', 400, 'RIDE_NOT_COMPLETED')
    }

    // Update the ride with rating and review
    await ride.update({ rating, review })

    // Update driver rating
    if (ride.driverId) {
      await Driver.incrementRating(ride.driverId, rating)
    }

    sendSuccess(res, { rideId: ride.id, rating, review }, 'Ride rated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Apply promotion to ride
 */
const applyPromotion = async (req, res, next) => {
  try {
    const rideId = req.params.id || req.body.rideId
    const { promoCode } = req.body
    const userId = req.userId

    if (!rideId) {
      throw new AppError('Ride ID is required', 400, 'MISSING_RIDE_ID')
    }

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.passengerId !== userId) {
      throw new AppError('Unauthorized to apply promotion to this ride', 403, 'UNAUTHORIZED')
    }

    if (ride.status !== RideStatus.PENDING && ride.status !== RideStatus.DRIVER_ASSIGNED) {
      throw new AppError('Promotion can only be applied to pending or assigned rides', 400, 'PROMOTION_NOT_APPLICABLE')
    }

    // Find promotion
    const promotion = await Promotion.findOne({
      where: {
        code: promoCode.toUpperCase(),
        [Op.or]: [
          { expiresAt: { [Op.gt]: new Date() } },
          { expiresAt: null }
        ]
      }
    })

    if (!promotion || !promotion.isValid()) {
      throw new AppError('Invalid or expired promotion code', 400, 'INVALID_PROMOTION')
    }

    // Check if user has exceeded usage limit
    if (promotion.maxUsesPerUser) {
      const userUsageCount = await Ride.count({
        where: {
          passengerId: userId,
          promoCode: promotion.code,
          createdAt: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)) // Last 30 days
          }
        }
      })

      if (userUsageCount >= promotion.maxUsesPerUser) {
        throw new AppError('You have exceeded the usage limit for this promotion', 400, 'PROMOTION_USAGE_LIMIT_EXCEEDED')
      }
    }

    // Check global usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new AppError('This promotion has exceeded its usage limit', 400, 'PROMOTION_GLOBAL_LIMIT_EXCEEDED')
    }

    // Calculate discount
    const discountAmount = promotion.calculateDiscount(ride.totalFare)
    const newTotalFare = ride.totalFare - discountAmount
    const newDriverEarnings = ride.driverEarnings - (discountAmount * 0.85) // Driver bears 85% of discount

    // Update ride with promotion
    await ride.update({
      promoCode: promotion.code,
      discountAmount,
      totalFare: newTotalFare,
      driverEarnings: newDriverEarnings
    })

    // Update promotion usage count
    await promotion.incrementUsage()

    sendSuccess(res, {
      ride: ride.toJSON(),
      promotion: promotion.toJSON()
    }, 'Promotion applied successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  requestRide,
  acceptRide,
  driverArrived,
  startRide,
  completeRide,
  cancelRide,
  getRide,
  getUserRides,
  getDriverRides,
  estimateRide,
  rateRide,
  applyPromotion
}