let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null,
    setex: async () => {},
    del: async () => 0
  }
}
const locationService = require('./locationService')
const { Driver, User } = require('../models')

/**
 * Geolocation Service - Real-time location tracking
 */
class GeolocationService {
  constructor () {
    this.DRIVER_LOCATION_PREFIX = 'driver:location:'
    this.PASSENGER_LOCATION_PREFIX = 'passenger:location:'
    this.LOCATION_EXPIRY = 5 * 60 // 5 minutes
    this.NEARBY_DRIVERS_RADIUS = 5000 // 5km in meters
  }

  /**
   * Start tracking a driver's location
   */
  async startTrackingDriver (driverId, initialLocation) {
    const key = `${this.DRIVER_LOCATION_PREFIX}${driverId}`

    await redis.setex(
      key,
      this.LOCATION_EXPIRY,
      JSON.stringify({
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        updatedAt: new Date().toISOString(),
        isOnline: true
      })
    )

    // Update driver status in database
    await Driver.update(
      { currentLat: initialLocation.lat, currentLng: initialLocation.lng, lastLocationUpdate: new Date() },
      { where: { id: driverId } }
    )

    return { success: true, message: 'Driver tracking started' }
  }

  /**
   * Stop tracking a driver's location
   */
  async stopTrackingDriver (driverId) {
    const key = `${this.DRIVER_LOCATION_PREFIX}${driverId}`
    await redis.del(key)

    // Update driver status in database
    await Driver.update(
      { currentLatitude: null, currentLongitude: null, lastLocationUpdate: null },
      { where: { id: driverId } }
    )

    return { success: true, message: 'Driver tracking stopped' }
  }

  /**
   * Update driver's location
   */
  async updateDriverLocation (driverId, location) {
    const key = `${this.DRIVER_LOCATION_PREFIX}${driverId}`

    const locationData = {
      lat: location.lat,
      lng: location.lng,
      updatedAt: new Date().toISOString(),
      isOnline: true
    }

    await redis.setex(key, this.LOCATION_EXPIRY, JSON.stringify(locationData))

    // Update driver in database
    await Driver.update(
      {
        currentLatitude: location.lat,
        currentLongitude: location.lng,
        lastLocationUpdate: new Date()
      },
      { where: { id: driverId } }
    )

    return { success: true, location: locationData }
  }

  /**
   * Get driver's current location
   */
  async getDriverLocation (driverId) {
    const key = `${this.DRIVER_LOCATION_PREFIX}${driverId}`
    const location = await redis.get(key)

    if (!location) {
      // Try to get from database
      const driver = await Driver.findByPk(driverId)
      if (driver && driver.currentLatitude && driver.currentLongitude) {
        return {
          lat: driver.currentLatitude,
          lng: driver.currentLongitude,
          updatedAt: driver.lastLocationUpdate,
          isOnline: false
        }
      }
      return null
    }

    return JSON.parse(location)
  }

  /**
   * Update passenger's location
   */
  async updatePassengerLocation (userId, location) {
    const key = `${this.PASSENGER_LOCATION_PREFIX}${userId}`

    const locationData = {
      lat: location.lat,
      lng: location.lng,
      updatedAt: new Date().toISOString()
    }

    await redis.setex(key, this.LOCATION_EXPIRY, JSON.stringify(locationData))

    return { success: true, location: locationData }
  }

  /**
   * Get passenger's current location
   */
  async getPassengerLocation (userId) {
    const key = `${this.PASSENGER_LOCATION_PREFIX}${userId}`
    const location = await redis.get(key)

    if (!location) {
      return null
    }

    return JSON.parse(location)
  }

  /**
   * Get nearby drivers
   */
  async getNearbyDrivers (location, radius = this.NEARBY_DRIVERS_RADIUS, limit = 10) {
    try {
      // Get all online drivers from Redis
      const pattern = `${this.DRIVER_LOCATION_PREFIX}*`
      const keys = await redis.keys(pattern)

      if (keys.length === 0) {
        return []
      }

      // Get all driver locations
      const locations = await Promise.all(
        keys.map(async (key) => {
          const location = await redis.get(key)
          if (location) {
            const parsed = JSON.parse(location)
            const driverId = key.replace(this.DRIVER_LOCATION_PREFIX, '')
            return { driverId, ...parsed }
          }
          return null
        })
      )

      // Filter by distance
      const nearbyDrivers = locations
        .filter(loc => loc && loc.isOnline)
        .map(loc => {
          const distance = locationService.calculateDistance(
            location.lat,
            location.lng,
            loc.lat,
            loc.lng
          )
          return { ...loc, distance: distance.meters }
        })
        .filter(loc => loc.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)

      // Get driver details
      const driverIds = nearbyDrivers.map(d => d.driverId)
      const drivers = await Driver.findAll({
        where: { id: driverIds, verificationStatus: 'approved', status: 'online' },
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar', 'rating'] }]
      })

      // Combine location data with driver details
      return nearbyDrivers.map(loc => {
        const driver = drivers.find(d => d.id === loc.driverId)
        if (driver) {
          return {
            driverId: driver.id,
            userId: driver.userId,
            name: driver.user.name,
            avatar: driver.user.avatar,
            rating: driver.user.rating,
            vehicle: driver.vehicleType,
            location: { lat: loc.lat, lng: loc.lng },
            distance: loc.distance,
            eta: locationService.estimateETA(loc.distance / 1000)
          }
        }
        return null
      }).filter(d => d !== null)
    } catch (error) {
      throw new Error(`Failed to get nearby drivers: ${error.message}`)
    }
  }

  /**
   * Get matching drivers for a ride request
   */
  async getMatchingDrivers (pickupLocation, dropoffLocation, options = {}) {
    const {
      radius = this.NEARBY_DRIVERS_RADIUS,
      vehicleType = null,
      limit = 5
    } = options

    // Get nearby drivers
    const nearbyDrivers = await this.getNearbyDrivers(pickupLocation, radius, limit * 2)

    // Filter by vehicle type if specified
    let matchingDrivers = nearbyDrivers
    if (vehicleType) {
      matchingDrivers = nearbyDrivers.filter(d => d.vehicle === vehicleType)
    }

    // Calculate ETA to pickup
    matchingDrivers = matchingDrivers.map(driver => ({
      ...driver,
      etaToPickup: locationService.estimateETA(driver.distance / 1000, 40) // Assume 40km/h average
    }))

    // Sort by ETA
    matchingDrivers.sort((a, b) => a.etaToPickup.minutes - b.etaToPickup.minutes)

    // Return top matches
    return matchingDrivers.slice(0, limit)
  }

  /**
   * Calculate route distance and duration
   */
  async calculateRoute (origin, destination) {
    try {
      const directions = await locationService.getDirections(origin, destination)

      return {
        distance: directions.distance,
        duration: directions.duration,
        polyline: directions.polyline
      }
    } catch (error) {
      throw new Error(`Failed to calculate route: ${error.message}`)
    }
  }

  /**
   * Get all online drivers count
   */
  async getOnlineDriversCount () {
    const pattern = `${this.DRIVER_LOCATION_PREFIX}*`
    const keys = await redis.keys(pattern)
    return keys.length
  }

  /**
   * Clean up expired locations
   */
  async cleanupExpiredLocations () {
    const driverPattern = `${this.DRIVER_LOCATION_PREFIX}*`
    const passengerPattern = `${this.PASSENGER_LOCATION_PREFIX}*`

    const driverKeys = await redis.keys(driverPattern)
    const passengerKeys = await redis.keys(passengerPattern)

    // Redis automatically expires keys, but we can force cleanup if needed
    return {
      driversCleaned: driverKeys.length,
      passengersCleaned: passengerKeys.length
    }
  }
}

module.exports = new GeolocationService()
