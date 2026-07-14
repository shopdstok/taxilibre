const { GeoZone } = require('../models')
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

/**
 * Geofencing Service for zone-based pricing and restrictions
 */
class GeofencingService {
  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  static isPointInPolygon (point, polygon) {
    const x = point.lng
    const y = point.lat
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]; const yi = polygon[i][1]
      const xj = polygon[j][0]; const yj = polygon[j][1]

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

      if (intersect) inside = !inside
    }

    return inside
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance (lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Find zone containing point
   */
  static async findZoneForPoint (lat, lng) {
    const cacheKey = `zone:${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`

    // Check cache
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Get all active zones
    const zones = await GeoZone.findAll({
      where: { isActive: true }
    })

    for (const zone of zones) {
      let isInside = false

      if (zone.radiusKm && zone.centerLatitude && zone.centerLongitude) {
        // Circular zone
        const distance = this.calculateDistance(
          lat, lng,
          zone.centerLatitude, zone.centerLongitude
        )
        isInside = distance <= zone.radiusKm
      } else if (zone.geometry && zone.geometry.coordinates) {
        // Polygon zone
        isInside = this.isPointInPolygon(
          { lat, lng },
          zone.geometry.coordinates[0]
        )
      }

      if (isInside) {
        await redis.setEx(cacheKey, 3600, JSON.stringify(zone)) // Cache 1 hour
        return zone
      }
    }

    return null
  }

  /**
   * Get pricing multipliers for location
   */
  static async getPricingForLocation (lat, lng) {
    const zone = await this.findZoneForPoint(lat, lng)

    if (!zone) {
      return {
        baseFareMultiplier: 1.0,
        perKmMultiplier: 1.0,
        perMinuteMultiplier: 1.0,
        minimumFare: null,
        zoneType: 'default'
      }
    }

    // Check peak hours
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    let peakMultiplier = 1.0
    if (zone.peakHours) {
      for (const peak of zone.peakHours) {
        if (currentTime >= peak.start && currentTime <= peak.end) {
          peakMultiplier = peak.multiplier
          break
        }
      }
    }

    return {
      baseFareMultiplier: zone.baseFareMultiplier * peakMultiplier,
      perKmMultiplier: zone.perKmMultiplier * peakMultiplier,
      perMinuteMultiplier: zone.perMinuteMultiplier * peakMultiplier,
      minimumFare: zone.minimumFare,
      zoneType: zone.type,
      zoneName: zone.name,
      peakMultiplier
    }
  }

  /**
   * Check if ride is allowed between pickup and dropoff
   */
  static async validateRideRoute (pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType) {
    const pickupZone = await this.findZoneForPoint(pickupLat, pickupLng)
    const dropoffZone = await this.findZoneForPoint(dropoffLat, dropoffLng)

    const errors = []

    // Check restricted zones
    if (pickupZone?.type === 'restricted') {
      errors.push('Pickup location is in a restricted zone')
    }
    if (dropoffZone?.type === 'restricted') {
      errors.push('Dropoff location is in a restricted zone')
    }

    // Check vehicle restrictions
    if (pickupZone?.restrictedVehicleTypes?.includes(vehicleType)) {
      errors.push(`Vehicle type ${vehicleType} not allowed in pickup zone`)
    }
    if (dropoffZone?.restrictedVehicleTypes?.includes(vehicleType)) {
      errors.push(`Vehicle type ${vehicleType} not allowed in dropoff zone`)
    }

    // Check airport zones (special handling)
    if (pickupZone?.type === 'airport' || dropoffZone?.type === 'airport') {
      // Could add special validation here
    }

    return {
      valid: errors.length === 0,
      errors,
      pickupZone: pickupZone
        ? {
            name: pickupZone.name,
            type: pickupZone.type,
            multiplier: pickupZone.baseFareMultiplier
          }
        : null,
      dropoffZone: dropoffZone
        ? {
            name: dropoffZone.name,
            type: dropoffZone.type,
            multiplier: dropoffZone.baseFareMultiplier
          }
        : null
    }
  }

  /**
   * Get all drivers inside a zone
   */
  static async getDriversInZone (zoneId) {
    const zone = await GeoZone.findByPk(zoneId)
    if (!zone) return []

    // Get from Redis (driver locations stored by matchingService)
    const driverKeys = await redis.keys('driver:*:location')
    const driversInZone = []

    for (const key of driverKeys) {
      const driverData = await redis.get(key)
      if (!driverData) continue

      const { lat, lng, driverId, status } = JSON.parse(driverData)

      let isInside = false
      if (zone.radiusKm) {
        const distance = this.calculateDistance(
          lat, lng,
          zone.centerLatitude, zone.centerLongitude
        )
        isInside = distance <= zone.radiusKm
      } else if (zone.geometry) {
        isInside = this.isPointInPolygon(
          { lat, lng },
          zone.geometry.coordinates[0]
        )
      }

      if (isInside && status === 'online') {
        driversInZone.push({ driverId, lat, lng, status })
      }
    }

    return driversInZone
  }

  /**
   * Create new zone
   */
  static async createZone (zoneData) {
    const zone = await GeoZone.create(zoneData)

    // Clear cache
    await redis.del('zone:*')

    return zone
  }

  /**
   * Get surge multiplier for location based on demand
   */
  static async calculateSurgeForLocation (lat, lng) {
    const zone = await this.findZoneForPoint(lat, lng)

    if (!zone || !zone.surgeThreshold) {
      return { multiplier: 1.0, surgeActive: false }
    }

    // Get active ride requests in zone
    const activeRequests = await redis.keys('ride:request:*')
    let requestsInZone = 0
    let availableDrivers = 0

    for (const key of activeRequests) {
      const rideData = await redis.get(key)
      if (!rideData) continue

      const { pickupLat, pickupLng } = JSON.parse(rideData)
      const isInZone = zone.radiusKm
        ? this.calculateDistance(lat, lng, pickupLat, pickupLng) <= zone.radiusKm
        : this.isPointInPolygon({ lat: pickupLat, lng: pickupLng }, zone.geometry.coordinates[0])

      if (isInZone) requestsInZone++
    }

    // Get available drivers
    const driverKeys = await redis.keys('driver:*:location')
    for (const key of driverKeys) {
      const driverData = await redis.get(key)
      if (driverData && JSON.parse(driverData).status === 'online') {
        availableDrivers++
      }
    }

    // Calculate surge
    const demandSupplyRatio = requestsInZone / Math.max(availableDrivers, 1)
    let surgeMultiplier = 1.0
    let surgeActive = false

    if (requestsInZone >= zone.surgeThreshold && demandSupplyRatio > 1.5) {
      surgeMultiplier = Math.min(1 + (demandSupplyRatio - 1) * 0.5, 3.0)
      surgeActive = true
    }

    return {
      multiplier: parseFloat(surgeMultiplier.toFixed(2)),
      surgeActive,
      requestsInZone,
      availableDrivers,
      ratio: parseFloat(demandSupplyRatio.toFixed(2))
    }
  }
}

module.exports = GeofencingService
