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
const uuidv4 = () => crypto.randomUUID()
const { logger } = require('./loggingService')
const models = require('../models')
const socketService = require('./socketService')

const GEO_KEY = 'driver:locations'
const REQUEST_TIMEOUT_KEY = 'ride:request:'
const MATCH_TIMEOUT_MS = 30_000
const MAX_ATTEMPTS = 3
const INITIAL_SEARCH_RADIUS_M = 500

class RideMatchingService {
  constructor() {}

  async handleCreateRide(pickup, destination, passengerId, rideOptions = {}) {
    const rideId = uuidv4()

    try {
      await models.Ride.create({
        id: rideId,
        passengerId,
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        pickupAddress: rideOptions.pickupAddress || rideOptions.pickupAddress || `${pickup.lat}, ${pickup.lng}`,
        dropoffLatitude: destination?.lat ?? 0,
        dropoffLongitude: destination?.lng ?? 0,
        dropoffAddress: rideOptions.dropoffAddress || `${destination?.lat ?? 0}, ${destination?.lng ?? 0}`,
        estimatedDistance: rideOptions.estimatedDistance || 0,
        estimatedDuration: rideOptions.estimatedDuration || 0,
        baseFare: rideOptions.baseFare || 0,
        pricePerKm: rideOptions.pricePerKm || 0,
        pricePerMinute: rideOptions.pricePerMinute || 0,
        totalPrice: rideOptions.totalPrice || 0,
        paymentMethod: rideOptions.paymentMethod || 'card',
        status: models.RideStatus.REQUESTED,
        requestedAt: new Date()
      })

      await this.startMatchingProcess(rideId, pickup, passengerId)
      return rideId
    } catch (error) {
      logger.error('Echec creation trajet dans matching service', { error, rideId, pickup })
      throw error
    }
  }

  async startMatchingProcess(rideId, pickup, passengerId) {
    let attempt = 0

    const attemptMatch = async (currentRadiusM) => {
      attempt++
      logger.debug(`Tentative de matching #${attempt} pour trajet ${rideId}`, { radius: currentRadiusM })

      const drivers = await redisClient.georadius(
        GEO_KEY, pickup.lng, pickup.lat, currentRadiusM, 'm',
        'WITHDIST', 'WITHCOORD', 'COUNT', 10, 'SORT', 'ASC'
      )

      if (!drivers.length) {
        logger.warn(`Aucun conducteur trouve dans rayon ${currentRadiusM}m`, { rideId, attempt })
        if (attempt < MAX_ATTEMPTS) return attemptMatch(currentRadiusM * 2)

        socketService.sendToUser(passengerId, 'ride:no_driver', { rideId, reason: 'timeout_after_max_attempts' })
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

      driverSockets.forEach(driverId => socketService.sendToDriver(driverId, 'ride:requested', requestData))
      logger.info(`Demande de trajet envoyee a ${driverSockets.length} conducteurs`, { rideId, attempt, radius: currentRadiusM })

      const timeoutId = setTimeout(async () => {
        try {
          const ride = await models.Ride.findByPk(rideId, { attributes: ['status', 'driverId'] })
          if (!ride) return logger.warn(`Trajet ${rideId} introuvable pendant timeout`, {})

          try {
            await ride.update({ status: models.RideStatus.EXPIRED })
          } catch (updateErr) {
            logger.warn(`Impossible de mettre a jour le trajet expire`, { rideId })
          }
          socketService.sendToUser(passengerId, 'ride:no_driver', { rideId, reason: 'timeout_after_max_attempts' })
        } catch (error) {
          logger.error('Erreur pendant verification timeout matching', { error, rideId })
        } finally {
          await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)
          }

        if (timeoutId) clearTimeout(timeoutId)
      }, MATCH_TIMEOUT_MS)

      await Redis.setex(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`, MATCH_TIMEOUT_MS / 1000,
        JSON.stringify({ timeoutId, attempt, radiusM: currentRadiusM, startTime: Date.now() }))
    }

    return attemptMatch(INITIAL_SEARCH_RADIUS_M)
  }

  async handleAcceptRide(data) {
    const { rideId, driverId } = data
    const startTime = Date.now()

    try {
      const ride = await models.Ride.findByPk(rideId, {
        attributes: ['id', 'status', 'passengerId', 'driverId', 'pickupLatitude', 'pickupLongitude']
      })

      if (!ride) throw new Error(`Trajet ${rideId} introuvable`)

      if (ride.status !== models.RideStatus.REQUESTED) {
        logger.warn("Tentative d'acceptation sur trajet non disponible", {
          rideId, expectedStatus: models.RideStatus.REQUESTED,
          actualStatus: ride.status, requestingDriver: driverId, currentDriver: ride.driverId
        })
        socketService.sendToDriver(driverId, 'ride:already_taken', { rideId })
        return
      }

      await models.sequelize.transaction(async (t) => {
        await models.Ride.update(
          { driverId, status: models.RideStatus.ACCEPTED, acceptedAt: new Date() },
          { where: { id: rideId }, transaction: t }
        )
      })

      const etaMinutes = Math.max(3, Math.round(
        (this.haversineDistance(ride.pickupLatitude, ride.pickupLongitude, 0, 0) * 1000) / (20 * 1000 / 60)
      ))

      const matchData = { rideId, driverId, eta: etaMinutes }

      socketService.sendToUser(ride.passengerId, 'ride_accepted', matchData)
      socketService.sendToDriver(driverId, 'ride_accepted', { ...matchData, passengerId: ride.passengerId })

      logger.info('Trajet matching reussi', {
        rideId, driverId, passengerId: ride.passengerId,
        durationMs: Date.now() - startTime, attempt: 1
      })

      await Redis.del(`${REQUEST_TIMEOUT_KEY}${rideId}:timeout`)
    } catch (error) {
      if (error.message?.includes('Trajet introuvable')) {
        socketService.sendToDriver(driverId, 'error', { message: 'Trajet introuvable ou deja traite' })
      } else {
        logger.error('Echec acceptation trajet dans matching service', { error, rideId, driverId })
        socketService.sendToDriver(driverId, 'error', { message: 'Erreur interne du serveur' })
      }
      throw error
    }
  }

  async updateDriverLocation(driverId, lat, lng) {
    if (this.isValidCoordinate(lat, lng)) {
      await Redis.geoAdd(GEO_KEY, lng, lat, driverId)
      logger.debug('Position conducteur mise à jour', { driverId, lat, lng })
    } else {
      logger.warn('Coordonnées GPS invalides reçues', { driverId, lat, lng })
    }
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  toRad(degrees) { return degrees * Math.PI / 180 }

  isValidCoordinate(lat, lng) { return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 }
}

module.exports = new RideMatchingService()
