const { Driver, User, Vehicle, Ride, DriverStatus, PayoutMethod } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Register as driver
 */
const registerDriver = async (req, res, next) => {
  try {
    const {
      licenseNumber,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      licensePlate,
      payoutMethod = PayoutMethod.WEEKLY
    } = req.body
    const userId = req.userId

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ where: { userId } })
    if (existingDriver) {
      throw new AppError('Driver profile already exists', 400, 'DRIVER_EXISTS')
    }

    // Validate payoutMethod
    if (!Object.values(PayoutMethod).includes(payoutMethod)) {
      throw new AppError('Invalid payout method', 400, 'INVALID_PAYOUT_METHOD')
    }

    // Create driver profile
    const driver = await Driver.create({
      userId,
      licenseNumber,
      status: DriverStatus.OFFLINE,
      isVerified: false,
      payoutMethod,
      walletBalance: 0,
      rating: 5.0,
      ratingCount: 0,
      totalRides: 0,
      completionRate: 100,
      acceptanceRate: 100,
      responseTimeMs: 0
    })

    // Create vehicle
    await Vehicle.create({
      driverId: driver.id,
      type: vehicleType,
      brand: vehicleBrand,
      model: vehicleModel,
      year: vehicleYear,
      color: vehicleColor,
      licensePlate,
      isAccessible: false
    })

    sendSuccess(res, driver.toJSON(), 'Driver registration submitted for verification')
  } catch (error) {
    next(error)
  }
}

/**
 * Set driver status to online/available
 */
const goOnline = async (req, res, next) => {
  try {
    const driverId = req.driverId
    await Driver.update(
      { 
        status: DriverStatus.AVAILABLE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )
    sendSuccess(res, { status: 'online' }, 'Driver is now online and available')
  } catch (error) {
    next(error)
  }
}

/**
 * Set driver status to offline
 */
const goOffline = async (req, res, next) => {
  try {
    const driverId = req.driverId
    await Driver.update(
      { 
        status: DriverStatus.OFFLINE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )
    sendSuccess(res, { status: 'offline' }, 'Driver is now offline')
  } catch (error) {
    next(error)
  }
}

/**
 * Update driver status and location
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, currentLatitude, currentLongitude, heading, speed } = req.body
    const driverId = req.driverId

    // Validate status if provided
    if (status) {
      if (!Object.values(DriverStatus).includes(status)) {
        throw new AppError('Invalid driver status', 400, 'INVALID_DRIVER_STATUS')
      }
    }

    const updateData = {
      locationUpdatedAt: new Date()
    }

    if (status !== undefined) updateData.status = status
    if (currentLatitude !== undefined) updateData.currentLat = currentLatitude
    if (currentLongitude !== undefined) updateData.currentLng = currentLongitude
    if (heading !== undefined) updateData.heading = heading
    if (speed !== undefined) updateData.speed = speed

    await Driver.update(updateData, { where: { id: driverId } })

    const updatedDriver = await Driver.findByPk(driverId, {
      attributes: ['id', 'status', 'currentLat', 'currentLng', 'locationUpdatedAt', 'heading', 'speed']
    })

    sendSuccess(res, {
      status: updatedDriver.status,
      currentLatitude: updatedDriver.currentLat,
      currentLongitude: updatedDriver.currentLng,
      locationUpdatedAt: updatedDriver.locationUpdatedAt,
      heading: updatedDriver.heading,
      speed: updatedDriver.speed
    }, 'Status and location updated')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver profile
 */
const getProfile = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const driver = await Driver.findByPk(driverId, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: { exclude: ['password'] } 
        },
        { 
          model: Vehicle, 
          as: 'vehicles' 
        }
      ]
    })

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    sendSuccess(res, {
      ...driver.toJSON(),
      user: driver.user ? {
        id: driver.user.id,
        firstName: driver.user.firstName,
        lastName: driver.user.lastName,
        email: driver.user.email,
        phone: driver.user.phone
      } : null,
      vehicles: driver.vehicles
    }, 'Driver profile retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Update driver profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const updates = req.body

    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates }
    delete allowedUpdates.id
    delete allowedUpdates.userId
    delete allowedUpdates.createdAt
    delete allowedUpdates.updatedAt

    await Driver.update(allowedUpdates, { where: { id: driverId } })

    const updatedDriver = await Driver.findByPk(driverId)
    sendSuccess(res, updatedDriver.toJSON(), 'Profile updated')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver earnings
 */
const getEarnings = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const driver = await Driver.findByPk(driverId)

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    sendSuccess(res, {
      walletBalance: driver.walletBalance,
      totalEarnings: driver.totalEarnings,
      totalRides: driver.totalRides,
      payoutMethod: driver.payoutMethod
    }, 'Earnings retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver rides
 */
const getRides = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const { status, page = 1, limit = 10 } = req.query

    const whereClause = { driverId: driverId }
    if (status) {
      whereClause.status = status
    }

    const rides = await Ride.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'passenger',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
        },
        { 
          model: Vehicle, 
          as: 'vehicle',
          attributes: ['id', 'brand', 'model', 'year', 'color', 'licensePlate', 'vehicleType'] 
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
    }, 'Driver rides retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Get nearby drivers
 */
const getNearbyDrivers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000, vehicleType } = req.query
    const userId = req.userId // This should be passenger ID

    // Build where clause for drivers
    const whereClause = {
      status: DriverStatus.AVAILABLE,
      isVerified: true
    }

    // Add vehicle type filter if provided
    // Note: We'd need to join with Vehicle table for this, simplified for now

    const drivers = await Driver.findAll({
      where: whereClause,
      include: [{ 
        model: User, 
        as: 'user', 
        attributes: { exclude: ['password'] } 
      }]
    })

    // Filter by distance and vehicle type
    const nearbyDrivers = drivers.filter(driver => {
      if (!driver.currentLat || !driver.currentLng) return false
      
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        driver.currentLat,
        driver.currentLng
      )
      
      // For simplicity, we're not filtering by vehicle type here
      // In a real implementation, we'd join with Vehicle table
      return distance <= radius
    })

    sendSuccess(res, nearbyDrivers, 'Nearby drivers retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    // This would typically fetch from a Notification model
    // For now, return empty array
    sendSuccess(res, [], 'Notifications retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    // This would typically update a Notification model
    sendSuccess(res, {}, 'Notification marked as read')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver statistics
 */
const getStats = async (req, res, next) => {
  try {
    const driverId = req.driverId
    const driver = await Driver.findByPk(driverId)

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    sendSuccess(res, {
      totalRides: driver.totalRides,
      totalEarnings: driver.totalEarnings,
      rating: driver.rating,
      ratingCount: driver.ratingCount,
      completionRate: driver.completionRate,
      acceptanceRate: driver.acceptanceRate,
      averageResponseTimeMs: driver.responseTimeMs,
      walletBalance: driver.walletBalance,
      isVerified: driver.isVerified,
      verifiedAt: driver.verifiedAt
    }, 'Statistics retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Accept a ride request
 */
const acceptRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== null) {
      throw new AppError('Ride already assigned to another driver', 400, 'RIDE_ALREADY_ASSIGNED')
    }

    // Update ride
    await ride.update({
      driverId,
      status: RideStatus.DRIVER_ASSIGNED,
      driverAssignedAt: new Date()
    })

    // Update driver status
    await Driver.update(
      { 
        status: DriverStatus.BUSY,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )

    sendSuccess(res, { rideId: ride.id }, 'Ride accepted')
  } catch (error) {
    next(error)
  }
}

/**
 * Reject a ride request
 */
const rejectRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 400, 'NOT_ASSIGNED')
    }

    // Only allow rejection if still in assigned state
    if (ride.status !== RideStatus.DRIVER_ASSIGNED) {
      throw new AppError('Can only reject ride in assigned state', 400, 'RIDE_NOT_ASSIGNED')
    }

    // Update ride
    await ride.update({
      driverId: null,
      status: RideStatus.NO_DRIVER_FOUND,
      driverAssignedAt: null
    })

    // Update driver status back to available
    await Driver.update(
      { 
        status: DriverStatus.AVAILABLE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )

    sendSuccess(res, { rideId: ride.id }, 'Ride rejected')
  } catch (error) {
    next(error)
  }
}

/**
 * Mark passenger pickup (driver arrived)
 */
const markPickup = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.DRIVER_ASSIGNED) {
      throw new AppError('Ride is not in assigned state', 400, 'RIDE_NOT_ASSIGNED')
    }

    // Update ride
    await ride.update({
      status: RideStatus.DRIVER_ARRIVED,
      driverArrivedAt: new Date()
    })

    // Note: Driver status remains BUSY until ride starts

    sendSuccess(res, { rideId: ride.id }, 'Driver arrived at pickup location')
  } catch (error) {
    next(error)
  }
}

/**
 * Mark passenger arrived (ride started)
 */
const markArrived = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.DRIVER_ARRIVED) {
      throw new AppError('Ride is not in arrived state', 400, 'RIDE_NOT_ARRIVED')
    }

    // Update ride
    await ride.update({
      status: RideStatus.IN_PROGRESS,
      startedAt: new Date()
    })

    // Update driver status
    await Driver.update(
      { 
        status: DriverStatus.ON_RIDE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )

    sendSuccess(res, { rideId: ride.id }, 'Ride started')
  } catch (error) {
    next(error)
  }
}

/**
 * Complete a ride
 */
const completeRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const { tipAmount } = req.body
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new AppError('Ride is not in progress', 400, 'RIDE_NOT_IN_PROGRESS')
    }

    // Update ride with completion details
    await ride.update({
      status: RideStatus.COMPLETED,
      completedAt: new Date(),
      tip: tipAmount || 0
      // Note: Fare calculation and payment handling would be done in payment controller
    })

    // Update driver stats
    await Driver.incrementRideStats(driverId, {
      completed: true,
      tipped: tipAmount ? true : false,
      tipAmount: tipAmount || 0
    })

    // Update driver status to available
    await Driver.update(
      { 
        status: DriverStatus.AVAILABLE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )

    sendSuccess(res, { 
      rideId: ride.id,
      tip: ride.tip
    }, 'Ride completed')
  } catch (error) {
    next(error)
  }
}

/**
 * Cancel a ride (driver initiated)
 */
const cancelRide = async (req, res, next) => {
  try {
    const { rideId } = req.params
    const { reason } = req.body
    const driverId = req.driverId

    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      throw new AppError('Ride not found', 404, 'RIDE_NOT_FOUND')
    }

    if (ride.driverId !== driverId) {
      throw new AppError('You are not assigned to this ride', 403, 'NOT_ASSIGNED')
    }

    const cancellableStatuses = [
      RideStatus.PENDING,
      RideStatus.DRIVER_ASSIGNED,
      RideStatus.DRIVER_ARRIVED,
      RideStatus.IN_PROGRESS
    ]
    if (!cancellableStatuses.includes(ride.status)) {
      throw new AppError('Ride cannot be cancelled at this stage', 400, 'RIDE_CANNOT_CANCEL')
    }

    // Update ride
    await ride.update({
      status: RideStatus.CANCELLED_BY_DRIVER,
      cancellationReason: reason,
      cancelledBy: 'driver',
      cancelledAt: new Date()
    })

    // Update driver stats
    await Driver.incrementRideStats(driverId, {
      cancelled: true
    })

    // Update driver status to available
    await Driver.update(
      { 
        status: DriverStatus.AVAILABLE,
        locationUpdatedAt: new Date()
      }, 
      { where: { id: driverId } }
    )

    sendSuccess(res, { rideId: ride.id }, 'Ride cancelled by driver')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver's scheduled rides
 */
const getScheduledRides = async (req, res, next) => {
  try {
    // This would require a scheduledAt field in Ride model
    // For now, return empty array
    sendSuccess(res, [], 'Scheduled rides retrieved')
  } catch (error) {
    next(error)
  }
}

// Helper function to calculate distance (Haversine formula)
function calculateDistance (lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1000 // Return in meters
}

module.exports = {
  registerDriver,
  goOnline,
  goOffline,
  updateStatus,
  getProfile,
  updateProfile,
  getEarnings,
  getRides,
  getNearbyDrivers,
  getNotifications,
  markNotificationAsRead,
  getStats,
  acceptRide,
  rejectRide,
  markPickup,
  markArrived,
  completeRide,
  cancelRide,
  getScheduledRides
}