let Redis
let redisClient
try {
  const redisModule = require('../config/redis')
  Redis = redisModule.Redis || redisModule
  redisClient = redisModule.client || redisModule
} catch (e) {
  // Mock Redis implementation for testing
  const geoData = new Map()
  const keyValueStore = new Map()

  Redis = {
    georadius: async (key, lng, lat, radius, unit, ...args) => {
      // Return empty array - no drivers found
      return []
    },
    geoAdd: async (key, lng, lat, member) => {
      geoData.set(member, { lng, lat })
      return 1
    },
    del: async (key) => {
      keyValueStore.delete(key)
      geoData.delete(key)
      return 1
    },
    setex: async (key, expiry, value) => {
      keyValueStore.set(key, { value, expires: Date.now() + (expiry * 1000) })
      return true
    }
  }

  redisClient = {
    georadius: async (key, lng, lat, radius, unit, ...args) => {
      // Return empty array - no drivers found
      return []
    }
  }
}
const crypto = require('crypto')
const uuidv4 = () => crypto.randomUUID()
const { createRideSchema, acceptRideSchema } = require('../validators/rideValidator')
const { RideStatus } = require('../shared/types/ride')
const logger = require('../utils/logger')
const models = require('../models')
const socketService = require('./socketService')

const GEO_KEY = 'driver:locations'
const REQUEST_TIMEOUT_KEY = 'ride-request:'
const MATCH_TIMEOUT_MS = 30_000
const MAX_ATTEMPTS = 3
const INITIAL_SEARCH_RADIUS_M = 500

class RideMatchingService {
  constructor () {}

  async handleCreateRide (pickup, destination, passengerId) {
    const parsed = createRideSchema.parse({ pickup, destination })
    const rideId = uuidv4()

    try {
      await models.Ride.create({
        id: rideId,
        passengerId,
        pickupLat: parsed.pickup.lat,
        pickupLng: parsed.pickup.lng,
        destinationLat: parsed.destination?.lat ?? null,
        destinationLng: parsed.destination?.lng ?? null,
        status: models.RideStatus.REQUESTED,
        createdAt: new Date()
      })

      await this.startMatchingProcess(rideId, parsed.pickup)
      return rideId
    } catch (error) {
      logger.error('Échec création trajet dans matching service', { error, rideId, pickup })
      throw error
    }
  }

  async startMatchingProcess (rideId, pickup) {
    let attempt = 0

    const attemptMatch = async (currentRadiusM) => {
      attempt++
      logger.debug(`Tentative de matching #${attempt} pour trajet ${rideId}`, { radius: currentRadiusM })

      const drivers = await redisClient.georadius(
        GEO_KEY, pickup.lng, pickup.lat, currentRadiusM, 'm',
        'WITHDIST', 'WITHCOORD', 'COUNT', 10, 'SORT', 'ASC'
      )

      if (!drivers.length) {
        logger.warning(`Aucun conducteur trouvé dans rayon ${currentRadiusM}m`, { rideId, attempt })
        if (attempt < MAX_ATTEMPTS) return attemptMatch(currentRadiusM * 2)

        socketService.sendToUser(passengerId, 'ride-not-found', { rideId, reason: 'timeout_after_max_attempts' })
        return
      }

      const driverSockets = drivers
        .map(([driverId, distance]) => ({ driverId, distance }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
        .map(d => d.driverId)

      const requestData = {
        rideId,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        fareEstimate: 0,
        createdAt: new Date().toISOString()
      }

      driverSockets.forEach(driverId => socketService.sendToDriver(driverId, 'ride-request', requestData))
      logger.info(`Demande de trajet envoyée à ${driverSockets.length} conducteurs`, { rideId, attempt, radius: currentRadiusM })

      const timeoutId = setTimeout(async () => {
        try {
          const ride = await models.Ride.findByPk(rideId, { attributes: ['status', 'driverId'] })
          if (!ride) return logger.warning(`Trajet ${rideId} introuvable pendant timeout`, {})

          if (ride.status === models.RideStatus.REQUESTED) {
            if (attempt < MAX_ATTEMPTS) {
              clearTimeout(timeoutId)
              return attemptMatch(currentRadiusM * 2)
            }
            logger.warning(`Échec matching après ${MAX_ATTEMPTS} tentatives`, { rideId, attempt })
            socketService.sendToUser(passengerId, 'ride-not-found', { rideId, reason: 'timeout_after_max_attempts' })
          }
        } catch (error) {
          logger.error('Erreur pendant vérification timeout matching', { error, rideId })
        } finally {
          await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)
        }
      }, MATCH_TIMEOUT_MS)

      await Redis.setex(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`, MATCH_TIMEOUT_MS / 1000,
        JSON.stringify({ timeoutId, attempt, radiusM: currentRadiusM, startTime: Date.now() }))
    }

    return attemptMatch(INITIAL_SEARCH_RADIUS_M)
  }

  async handleAcceptRide (data) {
    const { rideId, driverId } = data
    const startTime = Date.now()

    try {
      const parsed = acceptRideSchema.parse({ rideId, driverId })
      const ride = await models.Ride.findByPk(parsed.rideId, { attributes: ['id', 'status', 'passengerId', 'driverId'] })

      if (!ride) throw new Error(`Trajet ${parsed.rideId} introuvable`)

      if (ride.status !== models.RideStatus.REQUESTED) {
        logger.warning('Tentative d\'acceptation sur trajet non disponible', {
          rideId: parsed.rideId, expectedStatus: models.RideStatus.REQUESTED,
          actualStatus: ride.status, requestingDriver: parsed.driverId, currentDriver: ride.driverId
        })
        socketService.sendToDriver(parsed.driverId, 'ride-already-taken', { rideId: parsed.rideId })
        return
      }

      await models.sequelize.transaction(async (t) => {
        await models.Ride.update(
          { driverId: parsed.driverId, status: models.RideStatus.ASSIGNED, assignedAt: new Date() },
          { where: { id: parsed.rideId }, transaction: t }
        )
      })

      const etaMinutes = Math.max(5, Math.round(
        (this.haversineDistance(ride.pickupLat, ride.pickupLng, 0, 0) * 1000) / (20 * 1000 / 60)
      ))

      const matchData = { rideId: parsed.rideId, driverId: parsed.driverId, eta: etaMinutes }

      socketService.sendToUser(ride.passengerId, 'ride-matched', matchData)
      socketService.sendToDriver(parsed.driverId, 'ride-matched', { ...matchData, passengerId: ride.passengerId })

      logger.info('Trajet matching réussi', {
        rideId: parsed.rideId, driverId: parsed.driverId, passengerId: ride.passengerId,
        durationMs: Date.now() - startTime, attempt: 1
      })

      await Redis.del(`${REQUEST_TIMEOUT_KEY}${parsed.rideId}:timeout`)
    } catch (error) {
      if (error.message?.includes('Trajet introuvable')) {
        socketService.sendToDriver(driverId, 'error', { message: 'Trajet introuvable ou déjà traité' })
      } else {
        logger.error('Échec acceptation trajet dans matching service', { error, rideId: parsed?.rideId, driverId })
        socketService.sendToDriver(driverId, 'error', { message: 'Erreur interne du serveur' })
      }
      throw error
    }
  }

  async updateDriverLocation (driverId, lat, lng) {
    if (this.isValidCoordinate(lat, lng)) {
      await Redis.geoAdd(GEO_KEY, lng, lat, driverId)
      logger.debug('Position conducteur mise à jour', { driverId, lat, lng })
    } else {
      logger.warning('Coordonnées GPS invalides reçues', { driverId, lat, lng })
    }
  }

  haversineDistance (lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  toRad (degrees) { return degrees * Math.PI / 180 }

  isValidCoordinate (lat, lng) { return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 }
}

module.exports = new RideMatchingService()

