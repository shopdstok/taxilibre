const GeofencingService = require('../services/geofencingService')
const { GeoZone } = require('../models')
const { sendSuccess, sendError } = require('../utils/response')

class GeofencingController {
  /**
   * Create new zone
   */
  static async createZone (req, res) {
    try {
      const zoneData = req.body

      // Validate required fields
      if (!zoneData.name || !zoneData.type || !zoneData.geometry) {
        return sendError(res, 'name, type, and geometry are required', 400)
      }

      const zone = await GeofencingService.createZone(zoneData)

      return sendSuccess(res, zone, 'Zone created successfully', 201)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get all zones
   */
  static async getZones (req, res) {
    try {
      const { country, city, type, isActive } = req.query

      const whereClause = {}
      if (country) whereClause.country = country
      if (city) whereClause.city = city
      if (type) whereClause.type = type
      if (isActive !== undefined) whereClause.isActive = isActive === 'true'

      const zones = await GeoZone.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      })

      return sendSuccess(res, { count: zones.length, zones }, 'Zones retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get zone by ID
   */
  static async getZoneById (req, res) {
    try {
      const { id } = req.params

      const zone = await GeoZone.findByPk(id)

      if (!zone) {
        return sendError(res, 'Zone not found', 404)
      }

      return sendSuccess(res, zone, 'Zone retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Update zone
   */
  static async updateZone (req, res) {
    try {
      const { id } = req.params
      const updateData = req.body

      const zone = await GeoZone.findByPk(id)

      if (!zone) {
        return sendError(res, 'Zone not found', 404)
      }

      await zone.update(updateData)

      // Clear cache
      let redis
      try {
        redis = require('../config/redis')
      } catch (e) {
        redis = {
          del: async () => 0
        }
      }
      await redis.del('zone:*')

      return sendSuccess(res, zone, 'Zone updated successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Delete zone
   */
  static async deleteZone (req, res) {
    try {
      const { id } = req.params

      const zone = await GeoZone.findByPk(id)

      if (!zone) {
        return sendError(res, 'Zone not found', 404)
      }

      await zone.destroy()

      // Clear cache
      let redis
      try {
        redis = require('../config/redis')
      } catch (e) {
        redis = {
          del: async () => 0
        }
      }
      await redis.del('zone:*')

      return sendSuccess(res, { message: 'Zone deleted' }, 'Zone deleted', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Check point location
   */
  static async checkLocation (req, res) {
    try {
      const { lat, lng } = req.query

      if (!lat || !lng) {
        return sendError(res, 'lat and lng are required', 400)
      }

      const zone = await GeofencingService.findZoneForPoint(
        parseFloat(lat),
        parseFloat(lng)
      )

      const pricing = await GeofencingService.getPricingForLocation(
        parseFloat(lat),
        parseFloat(lng)
      )

      let zoneInfo = null
      if (zone) {
        zoneInfo = {
          id: zone.id,
          name: zone.name,
          type: zone.type
        }
      }

      return sendSuccess(res, { inZone: !!zone, zone: zoneInfo, pricing }, 'Location checked successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Validate ride route
   */
  static async validateRoute (req, res) {
    try {
      const {
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        vehicleType
      } = req.body

      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
        return sendError(res, 'All coordinates are required', 400)
      }

      const result = await GeofencingService.validateRideRoute(
        parseFloat(pickupLat),
        parseFloat(pickupLng),
        parseFloat(dropoffLat),
        parseFloat(dropoffLng),
        vehicleType
      )

      return sendSuccess(res, result, 'Route validation completed successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get surge status
   */
  static async getSurgeStatus (req, res) {
    try {
      const { lat, lng } = req.query

      if (!lat || !lng) {
        return sendError(res, 'lat and lng are required', 400)
      }

      const surge = await GeofencingService.calculateSurgeForLocation(
        parseFloat(lat),
        parseFloat(lng)
      )

      return sendSuccess(res, surge, 'Surge status retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }

  /**
   * Get drivers in zone
   */
  static async getDriversInZone (req, res) {
    try {
      const { zoneId } = req.params

      const drivers = await GeofencingService.getDriversInZone(zoneId)

      return sendSuccess(res, { count: drivers.length, drivers }, 'Drivers in zone retrieved successfully', 200)
    } catch (error) {
      return sendError(res, error.message, 500)
    }
  }
}

module.exports = GeofencingController
