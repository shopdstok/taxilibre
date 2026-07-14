const { Driver, User, Vehicle, Ride } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')
const AppError = require('../middleware/errorMiddleware').AppError

/**
 * Register as driver
 */
const registerDriver = async (req, res, next) => {
  try {
    const { licenseNumber, vehicleType, vehicleBrand, vehicleModel, vehicleYear, vehicleColor, plateNumber } = req.body
    const userId = req.userId

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ where: { userId } })
    if (existingDriver) {
      throw new AppError('Driver profile already exists', 400, 'DRIVER_EXISTS')
    }

    // Create driver profile
    const driver = await Driver.create({
      userId,
      licenseNumber,
      status: 'offline',
      verificationStatus: 'pending'
    })

    // Create vehicle
    await Vehicle.create({
      driverId: driver.id,
      type: vehicleType,
      brand: vehicleBrand,
      model: vehicleModel,
      year: vehicleYear,
      color: vehicleColor,
      plateNumber
    })

    sendSuccess(res, driver, 'Driver registration submitted for verification')
  } catch (error) {
    next(error)
  }
}

/**
 * Set driver status to online
 */
const goOnline = async (req, res, next) => {
  try {
    const driverId = req.driverId
    await Driver.update({ status: 'online' }, { where: { id: driverId } })
    sendSuccess(res, { status: 'online' }, 'Driver is now online')
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
    await Driver.update({ status: 'offline' }, { where: { id: driverId } })
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
    const { status, currentLatitude, currentLongitude } = req.body
    const driverId = req.driverId

    await Driver.update(
      { status, currentLatitude, currentLongitude, lastLocationUpdate: new Date() },
      { where: { id: driverId } }
    )

    sendSuccess(res, { status, currentLatitude, currentLongitude }, 'Status updated')
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
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Vehicle, as: 'vehicles' }
      ]
    })

    if (!driver) {
      throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND')
    }

    sendSuccess(res, driver, 'Driver profile retrieved')
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

    await Driver.update(updates, { where: { id: driverId } })

    const updatedDriver = await Driver.findByPk(driverId)
    sendSuccess(res, updatedDriver, 'Profile updated')
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
      totalEarnings: driver.totalEarnings,
      totalRides: driver.totalRides
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
    const rides = await Ride.findAll({
      where: { driverId },
      order: [['createdAt', 'DESC']],
      limit: 50
    })

    sendSuccess(res, rides, 'Rides retrieved')
  } catch (error) {
    next(error)
  }
}

/**
 * Get nearby drivers
 */
const getNearbyDrivers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query

    const drivers = await Driver.findAll({
      where: {
        status: 'online',
        verificationStatus: 'approved'
      },
      include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }]
    })

    // Filter by distance (simplified)
    const nearbyDrivers = drivers.filter(driver => {
      if (!driver.currentLatitude || !driver.currentLongitude) return false
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        driver.currentLatitude,
        driver.currentLongitude
      )
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
      rating: driver.rating
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

    await Ride.update(
      { driverId, status: 'accepted', acceptedAt: new Date() },
      { where: { id: rideId } }
    )

    sendSuccess(res, { rideId }, 'Ride accepted')
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
    sendSuccess(res, { rideId }, 'Ride rejected')
  } catch (error) {
    next(error)
  }
}

/**
 * Mark passenger pickup
 */
const markPickup = async (req, res, next) => {
  try {
    const { rideId } = req.params
    await Ride.update({ status: 'driver_arrived' }, { where: { id: rideId } })
    sendSuccess(res, { rideId }, 'Passenger picked up')
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
    await Ride.update({ status: 'ride_started', rideStartTime: new Date() }, { where: { id: rideId } })
    sendSuccess(res, { rideId }, 'Ride started')
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
    await Ride.update({ status: 'completed', rideEndTime: new Date() }, { where: { id: rideId } })
    sendSuccess(res, { rideId }, 'Ride completed')
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver's scheduled rides
 */
const getScheduledRides = async (req, res, next) => {
  try {
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
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
  getScheduledRides
}
