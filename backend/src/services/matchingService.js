let Redis
let redisClient
try {
  const redisModule = require('../config/redis')
  Redis = redisModule.Redis || redisModule
  redisClient = redisModule.client || redisModule
} catch (e) {
  const geoData = new Map()
  const keyValueStore = new Map()

  Redis = redisClient = {
    georadius: async (_key, _lng, _lat, _radius, _unit, ..._args) => [],
    geoAdd: async (key, lng, lat, member) => { geoData.set(member, { lng, lat }); return 1 },
    del: async (key) => { keyValueStore.delete(key); geoData.delete(key); return 1 },
    setex: async (key, expiry, value) => {
      keyValueStore.set(key, { value, expires: Date.now() + (expiry * 1000) }); return true
    }
  }
}
const crypto = require('crypto')
const { logger } = require('./loggingService')
const { Ride, RideStatus, Driver, User, Sequelize } = require('../models')
const socketService = require('./socketService')
const pricingService = require('./pricingService')
const geofencingService = require('./geofencingService')

const GEO_KEY_PREFIX = 'drivers:available:'
const REQUEST_TIMEOUT_KEY = 'ride:request:'
const MATCH_TIMEOUT_MS = 30_000 // 30 seconds for matching
const RIDE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes for ride expiry
const MAX_INITIAL_RADIUS_M = 2000 // 2km initial search radius
const MAX_DRIVERS_TO_CONSIDER = 20

class RideMatchingService {
  /**
   * Create a new ride request and start matching process
   * @param {Object} rideData - { pickup, destination, passengerId, vehicleType, etc }
   * @returns {string} Ride ID
   */
  async requestRide(rideData) {
    const {
      pickup,
      destination,
      passengerId,
      vehicleType = 'ECONOMY'
    } = rideData

    // Validate inputs
    if (!pickup || !pickup.lat || !pickup.lng) {
      throw new Error('Valid pickup location is required')
    }

    if (!destination || !destination.lat || !destination.lng) {
      throw new Error('Valid destination location is required')
    }

    if (!passengerId) {
      throw new Error('Passenger ID is required')
    }

    const rideId = crypto.randomUUID()

    try {
      // Create ride record
      const ride = await Ride.create({
        id: rideId,
        passengerId,
        vehicleType,
        pickupAddress: rideOptions.pickupAddress || `${pickup.lat}, ${pickup.lng}`,
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        dropoffAddress: rideOptions.dropoffAddress || `${destination.lat}, ${destination.lng}`,
        dropoffLatitude: destination.lat,
        dropoffLongitude: destination.lng,
        status: RideStatus.PENDING,
        requestedAt: new Date()
      })

      // Calculate estimated fare and distance
      const estimatedFare = await pricingService.calculateRidePrice({
        distanceKm: 0, // Will be calculated after matching
        durationMinutes: 0, // Will be calculated after matching
        vehicleTypeId: null, // Will be set after vehicle assignment
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        dropoffLatitude: destination.lat,
        dropoffLongitude: destination.lng,
        rideTime: new Date()
      })

      // Update ride with estimated fare
      await ride.update({
        baseFare: estimatedFare.basePrice,
        distanceFare: estimatedFare.distancePrice,
        timeFare: estimatedFare.durationPrice,
        surgeMultiplier: estimatedFare.surgeMultiplier,
        waitingFee: estimatedFare.waitingFee || 0,
        subtotal: estimatedFare.subtotal,
        serviceFee: estimatedFare.serviceFee,
        totalFare: estimatedFare.totalPrice,
        estimatedDistance: 0, // Will update after matching
        estimatedDuration: 0 // Will update after matching
      })

      // Start matching process
      await this.startMatchingProcess(rideId, pickup, destination, vehicleType, passengerId)

      return rideId
    } catch (error) {
      logger.error('Error creating ride in matching service', { error, rideData })
      throw error
    }
  }

  /**
   * Start the matching process for a ride
   * @param {string} rideId - Ride ID
   * @param {Object} pickup - { lat, lng, address }
   * @param {Object} destination - { lat, lng, address }
   * @param {string} vehicleType - Type of vehicle requested
   * @param {string} passengerId - Passenger's user ID
   */
  async startMatchingProcess(rideId, pickup, destination, vehicleType, passengerId) {
    let attempt = 0
    let currentRadiusM = 500 // Start with 500m radius
    const maxRadiusM = 5000 // Max 5km radius

    const attemptMatch = async () => {
      attempt++
      logger.debug(`Matching attempt #${attempt} for ride ${rideId}`, { radius: currentRadiusM })

      // Find nearby drivers
      const drivers = await this.findNearestDrivers(
        pickup.lng, 
        pickup.lat, 
        currentRadiusM, 
        vehicleType
      )

      if (!drivers || drivers.length === 0) {
        logger.warn(`No drivers found in radius ${currentRadiusM}m for ride ${rideId}`, { attempt })
        
        // Expand search radius exponentially
        if (attempt < 3 && currentRadiusM < maxRadiusM) {
          currentRadiusM = Math.min(currentRadiusM * 2, maxRadiusM)
          // Wait a bit before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000))
          return attemptMatch()
        } else {
          // No drivers found after max attempts
          await this.expireRide(rideId, 'NO_DRIVER_FOUND')
          socketService.sendToUser(passengerId, 'ride:no_driver_found', { 
            rideId, 
            reason: 'timeout_after_max_attempts' 
          })
          return
        }
      }

      // Score drivers
      const scoredDrivers = await this.scoreDrivers(drivers, rideId, passengerId)

      // Take top 10 drivers
      const topDrivers = scoredDrivers.slice(0, 10)

      // Send ride requests to drivers
      const requestData = {
        rideId,
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address || `${pickup.lat}, ${pickup.lng}` },
        destination: { lat: destination.lat, lng: destination.lng, address: destination.address || `${destination.lat}, ${destination.lng}` },
        vehicleType,
        fareEstimate: 0, // Will be updated after acceptance
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + MATCH_TIMEOUT_MS).toISOString()
      }

      topDrivers.forEach(driver => {
        socketService.sendToDriver(driver.id, 'ride:requested', requestData)
      })

      logger.info(`Sent ride request to ${topDrivers.length} drivers`, { 
        rideId, 
        attempt, 
        radius: currentRadiusM,
        driverCount: topDrivers.length
      })

      // Set up timeout for first response
      const timeoutId = setTimeout(async () => {
        try {
          // Check if ride is still pending
          const ride = await Ride.findByPk(rideId)
          if (!ride) return

          if (ride.status === RideStatus.PENDING) {
            // No driver accepted within timeout, expire ride
            await this.expireRide(rideId, 'NO_DRIVER_FOUND')
            socketService.sendToUser(passengerId, 'ride:no_driver_found', { 
              rideId, 
              reason: 'timeout_after_max_attempts' 
            })
          }
        } catch (error) {
          logger.error('Error during ride timeout check', { error, rideId })
        } finally {
          // Clean up timeout key
          await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)
        }
      }, MATCH_TIMEOUT_MS)

      // Store timeout ID
      await Redis.setex(
        `${REQUEST_TIMEOUT_KEY}${rideId}:timeout`, 
        MATCH_TIMEOUT_MS / 1000,
        JSON.stringify({ timeoutId, attempt, radiusM: currentRadiusM })
      )
    }

    // Start the matching process
    return attemptMatch()
  }

  /**
   * Find nearest drivers within a radius
   * @param {number} lng - Longitude
   * @param {number} lat - Latitude
   * @param {number} radiusM - Radius in meters
   * @param {string} vehicleType - Required vehicle type
   * @returns {Array} Array of driver objects
   */
  async findNearestDrivers(lng, lat, radiusM, vehicleType) {
    try {
      // Get geo data from Redis
      const geoKey = `${GEO_KEY_PREFIX}${vehicleType}`
      
      const drivers = await redisClient.georadius(
        geoKey, 
        lng, 
        lat, 
        radiusM, 
        'm',
        'WITHDIST', 
        'WITHCOORD'
      )

      if (!drivers || drivers.length === 0) {
        return []
      }

      // Convert to driver objects
      const driverObjects = drivers
        .map(([driverId, distance]) => ({
          id: driverId,
          distance: parseFloat(distance) // Distance in meters
        }))
        .filter(driver => !isNaN(driver.distance))
        .sort((a, b) => a.distance - b.distance)

      // Get detailed driver information
      const detailedDrivers = await Promise.all(
        driverObjects.map(async (driver) => {
          try {
            const driverDetail = await Driver.findByPk(driver.id, {
              include: [{
                model: User,
                attributes: ['id', 'email', 'firstName', 'lastName']
              }]
            })
            
            if (!driverDetail || !driverDetail.user) {
              return null
            }

            // Check if driver is available and verified
            if (driverDetail.status !== 'AVAILABLE' || !driverDetail.isVerified) {
              return null
            }

            // Get vehicle info
            const vehicle = await driverDetail.getVehicle()
            if (!vehicle || vehicle.type !== vehicleType) {
              return null
            }

            return {
              id: driverDetail.id,
              userId: driverDetail.userId,
              rating: driverDetail.rating || 0,
              completionRate: driverDetail.completionRate || 0,
              distance: driver.distance,
              lat: driverDetail.currentLat,
              lng: driverDetail.currentLng,
              vehicle: {
                type: vehicle.type,
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year,
                color: vehicle.color,
                licensePlate: vehicle.licensePlate
              }
            }
          } catch (error) {
            logger.warn('Error getting driver details', { error, driverId: driver.id })
            return null
          }
        })
      )

      // Filter out null values
      return detailedDrivers.filter(driver => driver !== null)
    } catch (error) {
      logger.error('Error finding nearest drivers', { error, lng, lat, radiusM, vehicleType })
      return []
    }
  }

  /**
   * Score drivers based on multiple factors
   * @param {Array} drivers - Array of driver objects
   * @param {string} rideId - Ride ID
   * @param {string} passengerId - Passenger ID
   * @returns {Array} Array of scored drivers sorted by score (descending)
   */
  async scoreDrivers(drivers, rideId, passengerId) {
    if (!drivers || drivers.length === 0) {
      return []
    }

    // Get passenger location for ETA calculation
    const ride = await Ride.findByPk(rideId)
    if (!ride) {
      return drivers.map(driver => ({ ...driver, score: 0 }))
    }

    const passengerLocation = {
      lat: ride.pickupLatitude,
      lng: ride.pickupLongitude
    }

    // Score each driver
    const scoredDrivers = await Promise.all(
      drivers.map(async (driver) => {
        try {
          // Distance score (closer is better) - 40% weight
          const maxDistance = 5000 // 5km max for scoring
          const distanceScore = Math.max(0, (maxDistance - driver.distance) / maxDistance)
          
          // Rating score (higher is better) - 30% weight
          const ratingScore = Math.min(driver.rating / 5, 1) // Assuming 5-star max
          
          // Completion rate score (higher is better) - 20% weight
          const completionScore = driver.completionRate // Already 0-1
          
          // ETA score (shorter is better) - 10% weight
          const etaMinutes = this.calculateETA(
            driver.lat, 
            driver.lng, 
            passengerLocation.lat, 
            passengerLocation.lng
          )
          const maxETA = 30 // 30 minutes max for scoring
          const etaScore = Math.max(0, (maxETA - etaMinutes) / maxETA)

          // Calculate weighted score
          const score = (
            (distanceScore * 0.4) +
            (ratingScore * 0.3) +
            (completionScore * 0.2) +
            (etaScore * 0.1)
          ) * 100 // Convert to 0-100 scale

          return {
            ...driver,
            score: parseFloat(score.toFixed(2)),
            distanceScore: parseFloat((distanceScore * 100).toFixed(2)),
            ratingScore: parseFloat((ratingScore * 100).toFixed(2)),
            completionScore: parseFloat((completionScore * 100).toFixed(2)),
            etaScore: parseFloat((etaScore * 100).toFixed(2)),
            etaMinutes: parseFloat(etaMinutes.toFixed(1))
          }
        } catch (error) {
          logger.warn('Error scoring driver', { error, driverId: driver.id })
          return {
            ...driver,
            score: 0,
            distanceScore: 0,
            ratingScore: 0,
            completionScore: 0,
            etaScore: 0,
            etaMinutes: 999
          }
        }
      })
    )

    // Sort by score descending
    return scoredDrivers
      .filter(driver => driver.score > 0)
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Calculate ETA between two points
   * @param {number} lat1 - Driver latitude
   * @param {number} lng1 - Driver longitude
   * @param {number} lat2 - Passenger latitude
   * @param {number} lng2 - Passenger longitude
   * @returns {number} ETA in minutes
   */
  calculateETA(lat1, lng1, lat2, lng2) {
    // Haversine distance
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distanceKm = R * c // Distance in km
    
    // Assume average speed of 25 km/h in city
    const speedKmH = 25
    const etaHours = distanceKm / speedKmH
    const etaMinutes = etaHours * 60
    
    return etaMinutes
  }

  /**
   * Handle driver accepting a ride
   * @param {Object} data - { rideId, driverId }
   * @returns {Object} Result
   */
  async handleDriverAccept(data) {
    const { rideId, driverId } = data
    const startTime = Date.now()

    try {
      // Validate inputs
      if (!rideId || !driverId) {
        throw new Error('Ride ID and Driver ID are required')
      }

      // Find ride
      const ride = await Ride.findByPk(rideId, {
        include: [{
          model: User,
          as: 'passenger'
        }]
      })

      if (!ride) {
        throw new Error(`Ride ${rideId} not found`)
      }

      // Check if ride is still pending
      if (ride.status !== RideStatus.PENDING) {
        logger.warn(`Driver attempted to accept non-pending ride`, {
          rideId,
          expectedStatus: RideStatus.PENDING,
          actualStatus: ride.status,
          requestingDriver: driverId
        })
        
        socketService.sendToDriver(driverId, 'ride:already_taken', { rideId })
        return {
          success: false,
          message: 'Ride already taken or expired'
        }
      }

      // Check if driver is the same vehicle type
      const driver = await Driver.findByPk(driverId, {
        include: [{
          model: User,
          attributes: ['id']
        }]
      })
      
      if (!driver) {
        throw new Error(`Driver ${driverId} not found`)
      }

      const vehicle = await driver.getVehicle()
      if (!vehicle || vehicle.type !== ride.vehicleType) {
        socketService.sendToDriver(driverId, 'ride:vehicle_mismatch', { rideId })
        return {
          success: false,
          message: 'Vehicle type mismatch'
        }
      }

      // Update ride with driver assignment
      await ride.update({
        driverId,
        status: RideStatus.DRIVER_ASSIGNED,
        driverAssignedAt: new Date()
      })

      // Calculate ETA
      const etaMinutes = this.calculateETA(
        driver.currentLat || 0,
        driver.currentLng || 0,
        ride.pickupLatitude,
        ride.pickupLongitude
      )

      const matchData = {
        rideId,
        driverId,
        eta: Math.max(1, Math.round(etaMinutes)),
        driver: {
          id: driver.id,
          name: `${driver.user.firstName || ''} ${driver.user.lastName || ''}`.trim(),
          rating: driver.rating || 0,
          vehicle: {
            type: vehicle.type,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            licensePlate: vehicle.licensePlate
          }
        }
      }

      // Notify passenger
      socketService.sendToUser(ride.passengerId, 'ride:driver_assigned', matchData)
      
      // Notify driver
      socketService.sendToDriver(driverId, 'ride:driver_assigned', {
        ...matchData,
        passengerId: ride.passengerId,
        passenger: {
          id: ride.passengerId,
          name: `${ride.passenger.firstName || ''} ${ride.passenger.lastName || ''}`.trim(),
          rating: ride.passenger.rating || 0
        }
      })

      // Clean up timeout
      await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)

      logger.info('Driver accepted ride successfully', {
        rideId,
        driverId,
        passengerId: ride.passengerId,
        durationMs: Date.now() - startTime
      })

      return {
        success: true,
        message: 'Ride accepted successfully',
        data: matchData
      }
    } catch (error) {
      logger.error('Error handling driver acceptance', { error, rideId, driverId })
      
      if (error.message?.includes('not found')) {
        socketService.sendToDriver(driverId, 'error', { 
          message: 'Ride or driver not found' 
        })
      } else {
        socketService.sendToDriver(driverId, 'error', { 
          message: 'Internal server error' 
        })
      }
      
      throw error
    }
  }

  /**
   * Handle driver declining a ride
   * @param {Object} data - { rideId, driverId }
   * @returns {Object} Result
   */
  async handleDriverDecline(data) {
    const { rideId, driverId } = data

    try {
      // Validate inputs
      if (!rideId || !driverId) {
        throw new Error('Ride ID and Driver ID are required')
      }

      // Find ride
      const ride = await Ride.findByPk(rideId)
      if (!ride) {
        throw new Error(`Ride ${rideId} not found`)
      }

      // If ride is still pending, we just log the decline
      // The matching service will continue with other drivers
      if (ride.status === RideStatus.PENDING) {
        logger.info(`Driver declined ride`, {
          rideId,
          driverId
        })
        
        socketService.sendToDriver(driverId, 'ride:declined_acknowledged', { rideId })
        
        return {
          success: true,
          message: 'Ride decline acknowledged'
        }
      } else {
        // Ride is no longer pending
        socketService.sendToDriver(driverId, 'ride:invalid_decline', { rideId })
        
        return {
          success: false,
          message: 'Ride is no longer available'
        }
      }
    } catch (error) {
      logger.error('Error handling driver decline', { error, rideId, driverId })
      socketService.sendToDriver(driverId, 'error', { 
        message: 'Internal server error' 
      })
      throw error
    }
  }

  /**
   * Cancel a ride
   * @param {string} rideId - Ride ID
   * @param {string} cancelledBy - Who cancelled (passenger, driver, system)
   * @param {string} reason - Cancellation reason
   * @returns {Object} Result
   */
  async cancelRide(rideId, cancelledBy, reason = '') {
    try {
      if (!rideId) {
        throw new Error('Ride ID is required')
      }

      const ride = await Ride.findByPk(rideId)
      if (!ride) {
        throw new Error(`Ride ${rideId} not found`)
      }

      // Update ride status
      await ride.update({
        status: 
          cancelledBy === 'PASSENGER' ? RideStatus.CANCELLED_BY_PASSENGER :
          cancelledBy === 'DRIVER' ? RideStatus.CANCELLED_BY_DRIVER :
          RideStatus.CANCELLED_BY_SYSTEM,
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy
      })

      // Notify other party if assigned
      if (ride.driverId && ride.status !== RideStatus.PENDING) {
        const otherParty = ride.passengerId === cancelledBy ? 'driver' : 'passenger'
        const otherId = otherParty === 'driver' ? ride.driverId : ride.passengerId
        
        socketService.sendToUser(otherId, 'ride:cancelled', {
          rideId,
          cancelledBy,
          reason: reason || 'Ride cancelled'
        })
      }

      // Clear timeout
      await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)

      logger.info('Ride cancelled', { 
        rideId, 
        cancelledBy, 
        reason 
      })

      return {
        success: true,
        message: 'Ride cancelled successfully'
      }
    } catch (error) {
      logger.error('Error cancelling ride', { error, rideId, cancelledBy })
      throw error
    }
  }

  /**
   * Expire a ride due to timeout
   * @param {string} rideId - Ride ID
   * @param {string} reason - Expiration reason
   * @returns {Promise<void>}
   */
  async expireRide(rideId, reason = 'timeout') {
    try {
      if (!rideId) {
        throw new Error('Ride ID is required')
      }

      const ride = await Ride.findByPk(rideId)
      if (!ride) {
        return
      }

      // Only expire if still pending
      if (ride.status === RideStatus.PENDING) {
        await ride.update({
          status: RideStatus.NO_DRIVER_FOUND,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledBy: 'SYSTEM'
        })

        // Notify passenger
        if (ride.passengerId) {
          socketService.sendToUser(ride.passengerId, 'ride:expired', {
            rideId,
            reason: reason || 'No driver found within timeout period'
          })
        }

        logger.info('Ride expired due to timeout', { 
          rideId, 
          reason 
        })
      }
    } catch (error) {
      logger.error('Error expiring ride', { error, rideId })
      throw error
    }
  }

  /**
   * Update driver location in Redis for matching
   * @param {string} driverId - Driver ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} vehicleType - Vehicle type
   */
  async updateDriverLocation(driverId, lat, lng, vehicleType = 'ECONOMY') {
    try {
      if (!driverId || !lat || !lng) {
        throw new Error('Driver ID, latitude, and longitude are required')
      }

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates')
      }

      // Update in Redis for matching
      const geoKey = `${GEO_KEY_PREFIX}${vehicleType}`
      await redisClient.geoAdd(geoKey, lng, lat, driverId)
      
      // Set expiration (10 minutes)
      await redisClient.setex(
        `driver:location:${driverId}`, 
        600, 
        JSON.stringify({ lat, lng, timestamp: Date.now() })
      )

      logger.debug('Driver location updated for matching', { 
        driverId, 
        lat, 
        lng, 
        vehicleType 
      })
    } catch (error) {
      logger.error('Error updating driver location', { error, driverId, lat, lng })
      throw error
    }
  }

  /**
   * Remove driver from Redis matching pool
   * @param {string} driverId - Driver ID
   * @param {string} vehicleType - Vehicle type
   */
  async removeDriverFromMatching(driverId, vehicleType = 'ECONOMY') {
    try {
      if (!driverId) {
        throw new Error('Driver ID is required')
      }

      // Remove from Redis
      const geoKey = `${GEO_KEY_PREFIX}${vehicleType}`
      await redisClient.zrem(geoKey, driverId)
      
      // Remove location cache
      await redisClient.del(`driver:location:${driverId}`)

      logger.debug('Driver removed from matching pool', { 
        driverId, 
        vehicleType 
      })
    } catch (error) {
      logger.error('Error removing driver from matching', { error, driverId })
      throw error
    }
  }
}

module.exports = new RideMatchingService()