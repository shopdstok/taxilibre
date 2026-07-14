const { Pricing, Zone, VehicleType, PromoCode } = require('../models')
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

class PricingService {
  constructor () {
    this.baseFares = {
      sedan: { base: 2.50, perKm: 1.20, perMinute: 0.25, baseDistance: 1 },
      suv: { base: 3.50, perKm: 1.80, perMinute: 0.35, baseDistance: 1 },
      luxury: { base: 5.00, perKm: 2.50, perMinute: 0.50, baseDistance: 2 },
      electric: { base: 2.00, perKm: 1.00, perMinute: 0.20, baseDistance: 1 },
      motorcycle: { base: 1.50, perKm: 1.00, perMinute: 0.15, baseDistance: 0.5 }
    }
  }

  async calculateRidePrice (rideData) {
    const {
      distanceKm,
      durationMinutes,
      vehicleType = 'sedan',
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      rideTime = new Date(),
      passengerId = null,
      isScheduledRide = false,
      isAirportRide = false,
      promoCode = null
    } = rideData

    try {
      const vehiclePricing = this.baseFares[vehicleType] || this.baseFares.sedan
      // const surgeMultiplier = await calculateSurgeMultiplier(pickupLatitude, pickupLongitude);
      const surgeMultiplier = 1.0 // Temporary default
      const pickupZone = await this.getZone(pickupLatitude, pickupLongitude)
      const dropoffZone = await this.getZone(dropoffLatitude, dropoffLongitude)
      const billableDistance = Math.max(distanceKm, vehiclePricing.baseDistance)

      const basePrice = vehiclePricing.base
      const distancePrice = billableDistance * vehiclePricing.perKm
      const timePrice = durationMinutes * vehiclePricing.perMinute

      let zoneSurcharges = 0
      if (pickupZone?.type === 'airport') {
        zoneSurcharges += pickupZone.surcharge || 5.00
      }
      if (dropoffZone?.type === 'airport') {
        zoneSurcharges += dropoffZone.surcharge || 5.00
      }

      const hour = rideTime.getHours()
      const timeMultiplier = this.getTimeMultiplier(hour, isScheduledRide)
      const weatherMultiplier = await this.getWeatherMultiplier(pickupLatitude, pickupLongitude)
      const demandMultiplier = await this.getDemandMultiplier(pickupLatitude, pickupLongitude)

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
            pickup: pickupZone?.name || 'Standard',
            dropoff: dropoffZone?.name || 'Standard'
          },
          pricing: vehiclePricing,
          rideTime: rideTime.toISOString()
        }
      }
    } catch (error) {
      throw new Error('Failed to calculate ride price')
    }
  }

  getTimeMultiplier (hour, isScheduledRide) {
    if (isScheduledRide) return 1.0

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

  async getZone (latitude, longitude) {
    try {
      const cacheKey = `zone:${Math.floor(latitude * 1000)}:${Math.floor(longitude * 1000)}`
      const cachedZone = await redis.get(cacheKey)

      if (cachedZone) {
        return JSON.parse(cachedZone)
      }

      const zone = await Zone.findOne({
        where: {
          isActive: true,
          latitude: { [Op.between]: [latitude - 0.01, latitude + 0.01] },
          longitude: { [Op.between]: [longitude - 0.01, longitude + 0.01] }
        }
      })

      if (zone) {
        await redis.setex(cacheKey, 3600, JSON.stringify(zone))
      }

      return zone
    } catch (error) {
      return null
    }
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

      await redis.setex(cacheKey, 300, JSON.stringify(promo))

      return this.calculatePromoDiscount(totalPrice, promo)
    } catch (error) {
      return { isValid: false, finalPrice: totalPrice }
    }
  }

  calculatePromoDiscount (totalPrice, promo) {
    let discountAmount = 0

    if (promo.type === 'percentage') {
      discountAmount = totalPrice * (promo.discount / 100)
      if (promo.maxDiscount) {
        discountAmount = Math.min(discountAmount, promo.maxDiscount)
      }
    } else if (promo.type === 'fixed') {
      if (!promo.minAmount || totalPrice >= promo.minAmount) {
        discountAmount = promo.discount
      }
    } else if (promo.type === 'free_ride') {
      if (totalPrice <= promo.maxValue) {
        discountAmount = totalPrice
      } else {
        discountAmount = promo.maxValue
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

  async getEstimatedFare (pickup, dropoff, vehicleType = 'sedan', options = {}) {
    const distance = this.calculateDistance(
      pickup.latitude, pickup.longitude,
      dropoff.latitude, dropoff.longitude
    )

    const estimatedDuration = Math.ceil(distance * 2.5)

    return await this.calculateRidePrice({
      distanceKm: distance,
      durationMinutes: estimatedDuration,
      vehicleType,
      pickupLatitude: pickup.latitude,
      pickupLongitude: pickup.longitude,
      dropoffLatitude: dropoff.latitude,
      dropoffLongitude: dropoff.longitude,
      ...options
    })
  }

  calculateDistance (lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}

module.exports = new PricingService()
