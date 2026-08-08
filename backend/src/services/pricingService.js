const { PricingZone, Vehicle, PromoCode } = require('../models')
// const { calculateSurgeMultiplier } = require('./matchingService');
let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null,
    setex: async () => {},
    del: async () => {},
    incr: async () => 1,
    getAsync: async () => null,
    setexAsync: async () => {}
  }
}
const { Op } = require('sequelize')
const { logger } = require('./loggingService')

class PricingService {
  constructor () {
    // Default pricing fallbacks if no zone found
    this.defaultPricing = {
      ECONOMY: { base: 2.50, perKm: 1.20, perMinute: 0.25, minimum: 5.00 },
      COMFORT: { base: 3.50, perKm: 1.80, perMinute: 0.35, minimum: 7.00 },
      PREMIUM: { base: 5.00, perKm: 2.50, perMinute: 0.50, minimum: 10.00 },
      VAN: { base: 4.00, perKm: 2.00, perMinute: 0.40, minimum: 8.00 },
      ACCESSIBLE: { base: 3.50, perKm: 1.80, perMinute: 0.35, minimum: 7.00 }
    }
  }

  async calculateRidePrice (rideData) {
    const {
      distanceKm,
      durationMinutes,
      vehicleTypeId,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      rideTime = new Date(),
      passengerId = null,
      promoCode = null
    } = rideData

    try {
      // Get vehicle details to determine type
      const vehicle = vehicleTypeId ? await Vehicle.findByPk(vehicleTypeId) : null
      const vehicleType = vehicle ? vehicle.type : 'ECONOMY' // default to ECONOMY

      // Get pricing zones for pickup and dropoff locations
      const pickupZone = await this.getPricingZone(pickupLatitude, pickupLongitude)
      const dropoffZone = await this.getPricingZone(dropoffLatitude, dropoffLongitude)
      
      // Use pickup zone pricing as primary (or dropoff if pickup not found)
      const pricingZone = pickupZone || dropoffZone
      
      // Get pricing config for vehicle type in this zone
      const vehiclePricing = this.getVehiclePricing(pricingZone, vehicleType) || 
                            this.defaultPricing[vehicleType] ||
                            this.defaultPricing.ECONOMY

      const billableDistance = Math.max(distanceKm, vehiclePricing.baseDistance || 1)

      const basePrice = vehiclePricing.base
      const distancePrice = billableDistance * vehiclePricing.perKm
      const timePrice = durationMinutes * vehiclePricing.perMinute

      let zoneSurcharges = 0
      if (pickupZone && pickupZone.surcharge) {
        zoneSurcharges += pickupZone.surcharge
      }
      if (dropoffZone && dropoffZone.surcharge) {
        zoneSurcharges += dropoffZone.surcharge
      }

      const hour = rideTime.getHours()
      const timeMultiplier = this.getTimeMultiplier(hour)
      const weatherMultiplier = await this.getWeatherMultiplier(pickupLatitude, pickupLongitude)
      const demandMultiplier = await this.getDemandMultiplier(pickupLatitude, pickupLongitude)
      const surgeMultiplier = await this.getSurgeMultiplier(pickupLatitude, pickupLongitude, vehicleType)

      const subtotal = basePrice + distancePrice + timePrice + zoneSurcharges
      const multipliedPrice = subtotal *
        surgeMultiplier *
        timeMultiplier *
        weatherMultiplier *
        demandMultiplier

      const serviceFee = Math.max(multipliedPrice * 0.15, 1.00)
      const taxes = multipliedPrice * 0.10

      const promoResult = promoCode
        ? await this.applyPromoCode(multipliedPrice, promoCode, passengerId)
        : { isValid: false, finalPrice: multipliedPrice }

      const finalPrice = promoResult.finalPrice + serviceFee + taxes

      return {
        basePrice: Math.round(basePrice * 100) / 100,
        distancePrice: Math.round(distancePrice * 100) / 100,
        timePrice: Math.round(timePrice * 100) / 100,
        zoneSurcharges: Math.round(zoneSurcharges * 100) / 100,
        surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
        timeMultiplier: Math.round(timeMultiplier * 100) / 100,
        weatherMultiplier: Math.round(weatherMultiplier * 100) / 100,
        demandMultiplier: Math.round(demandMultiplier * 100) / 100,
        serviceFee: Math.round(serviceFee * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        promoDiscount: promoResult.isValid
          ? Math.round((multipliedPrice - promoResult.finalPrice) * 100) / 100
          : 0,
        totalPrice: Math.round(finalPrice * 100) / 100,
        currency: 'EUR',
        breakdown: {
          vehicleType,
          distanceKm: Math.round(distanceKm * 100) / 100,
          durationMinutes,
          billableDistance: Math.round(billableDistance * 100) / 100,
          zones: {
            pickup: pickupZone ? pickupZone.nom : 'Standard',
            dropoff: dropoffZone ? dropoffZone.nom : 'Standard'
          },
          pricing: vehiclePricing,
          rideTime: rideTime.toISOString(),
          surgeApplied: surgeMultiplier > 1.0
        }
      }
    } catch (error) {
      logger.error('Erreur lors du calcul du prix du trajet', { error, rideData })
      throw new Error('Échec du calcul du prix du trajet')
    }
  }

  getTimeMultiplier (hour) {
    const peakPeriods = [
      { start: 7, end: 9, multiplier: 1.3 },
      { start: 17, end: 19, multiplier: 1.4 },
      { start: 22, end: 5, multiplier: 1.2 }
    ]

    for (const period of peakPeriods) {
      if (period.start <= period.end) {
        if (hour >= period.start && hour <= period.end) {
          return period.multiplier
        }
      } else {
        if (hour >= period.start || hour <= period.end) {
          return period.multiplier
        }
      }
    }

    return 1.0
  }

  async getPricingZone (latitude, longitude) {
    try {
      // First check cache
      const cacheKey = `zone:${Math.floor(latitude * 1000)}:${Math.floor(longitude * 1000)}`
      const cachedZone = await redis.get(cacheKey)

      if (cachedZone) {
        return JSON.parse(cachedZone)
      }

      // Find zone containing the point (simple bounding box for now, should use PostGIS in production)
      const zone = await PricingZone.findOne({
        where: {
          isActive: true,
          // Simple bounding box approximation - in production should use ST_Contains with PostGIS
          latitude: { [Op.between]: [latitude - 0.01, latitude + 0.01] },
          longitude: { [Op.between]: [longitude - 0.01, longitude + 0.01] }
        }
      })

      if (zone) {
        await redis.setex(cacheKey, 3600, JSON.stringify(zone.get({ plain: true })))
      }

      return zone
    } catch (error) {
      logger.warn('Erreur lors de la recherche de zone de tarification', { error, latitude, longitude })
      return null
    }
  }

  getVehiclePricing (pricingZone, vehicleType) {
    if (!pricingZone || !pricingZone.tarifs) return null
    
    // Assuming tarifs is a JSON object with vehicle type keys
    return pricingZone.tarifs[vehicleType] || null
  }

  async getWeatherMultiplier (latitude, longitude) {
    try {
      const cacheKey = `weather:${Math.floor(latitude * 100)}:${Math.floor(longitude * 100)}`
      const cachedWeather = await redis.get(cacheKey)

      if (cachedWeather) {
        const weather = JSON.parse(cachedWeather)
        return weather.multiplier || 1.0
      }

      const randomWeather = Math.random()
      let multiplier = 1.0

      if (randomWeather < 0.1) {
        multiplier = 1.3
      } else if (randomWeather < 0.15) {
        multiplier = 1.2
      } else if (randomWeather < 0.2) {
        multiplier = 1.1
      }

      await redis.setex(cacheKey, 1800, JSON.stringify({ multiplier }))
      return multiplier
    } catch (error) {
      return 1.0
    }
  }

  async getDemandMultiplier (latitude, longitude) {
    try {
      const areaKey = `demand:${Math.floor(latitude * 100)}:${Math.floor(longitude * 100)}`
      const recentRequests = await redis.get(areaKey) || 0

      let demandMultiplier = 1.0
      if (recentRequests > 10) {
        demandMultiplier = 1.2
      } else if (recentRequests > 5) {
        demandMultiplier = 1.1
      }

      return demandMultiplier
    } catch (error) {
      return 1.0
    }
  }

  async getSurgeMultiplier (latitude, longitude, vehicleType) {
    try {
      // In a real implementation, this would check real-time demand vs supply
      // For now, return a base multiplier with some randomness for demo
      const cacheKey = `surge:${Math.floor(latitude * 100)}:${Math.floor(longitude * 100)}:${vehicleType}`
      const cachedSurge = await redis.get(cacheKey)

      if (cachedSurge) {
        return parseFloat(cachedSurge)
      }

      // Base surge between 1.0 and 2.0 based on time of day and random factors
      const hour = new Date().getHours()
      let baseSurge = 1.0
      
      // Higher demand during commute hours
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        baseSurge = 1.3
      }
      // Evening/night demand
      else if (hour >= 20 || hour <= 5) {
        baseSurge = 1.2
      }

      // Add some randomness to simulate real-world fluctuations
      const randomFactor = 1.0 + (Math.random() - 0.5) * 0.4 // ±0.2
      let surgeMultiplier = baseSurge * randomFactor
      
      // Cap at reasonable limits
      surgeMultiplier = Math.max(1.0, Math.min(2.5, surgeMultiplier))

      await redis.setex(cacheKey, 300, surgeMultiplier.toString())
      return surgeMultiplier
    } catch (error) {
      return 1.0
    }
  }

  async applyPromoCode (totalPrice, promoCode, passengerId) {
    try {
      if (!promoCode) {
        return { isValid: false, finalPrice: totalPrice }
      }

      const cacheKey = `promo:${promoCode.toUpperCase()}`
      const cachedPromo = await redis.get(cacheKey)

      if (cachedPromo) {
        const promo = JSON.parse(cachedPromo)
        return this.calculatePromoDiscount(totalPrice, promo)
      }

      const promo = await PromoCode.findOne({
        where: {
          code: promoCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      })

      if (!promo) {
        return { isValid: false, finalPrice: totalPrice }
      }

      await redis.setex(cacheKey, 300, JSON.stringify(promo.get({ plain: true })))

      return this.calculatePromoDiscount(totalPrice, promo)
    } catch (error) {
      logger.warn("Erreur lors de l'application du code promo", {
  error,
  promoCode
});
      return { isValid: false, finalPrice: totalPrice }
    }
  }

  calculatePromoDiscount (totalPrice, promo) {
    let discountAmount = 0

    if (promo.type === 'PERCENTAGE') {
      discountAmount = totalPrice * (promo.valeur / 100)
      if (promo.valeurMax) {
        discountAmount = Math.min(discountAmount, promo.valeurMax)
      }
    } else if (promo.type === 'FIXED_AMOUNT') {
      if (!promo.montantMinimum || totalPrice >= promo.montantMinimum) {
        discountAmount = promo.valeur
      }
    } else if (promo.type === 'FREE_RIDE') {
      if (totalPrice <= promo.valeurMax) {
        discountAmount = totalPrice
      } else {
        discountAmount = promo.valeurMax
      }
    }

    const finalPrice = Math.max(totalPrice - discountAmount, 0)

    return {
      isValid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      promoCode: promo.code,
      promoType: promo.type
    }
  }

  async getEstimatedFare (pickup, dropoff, vehicleTypeId = null, options = {}) {
    const distance = this.calculateDistance(
      pickup.latitude, pickup.longitude,
      dropoff.latitude, dropoff.longitude
    )

    const estimatedDuration = Math.ceil(distance * 2.5)

    return await this.calculateRidePrice({
      distanceKm: distance,
      durationMinutes: estimatedDuration,
      vehicleTypeId,
      pickupLatitude: pickup.latitude,
      pickupLongitude: pickup.longitude,
      dropoffLatitude: dropoff.latitude,
      dropoffLongitude: dropoff.longitude,
      ...options
    })
  }

  calculateDistance (lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Returns distance in km
  }
}

module.exports = new PricingService()