const { VehicleType } = require('../models')

/**
 * Price Estimation Service for calculating ride fares
 */
class PriceEstimationService {
  constructor () {
    // Base pricing per vehicle type (in FCFA)
    this.basePricing = {
      economy: {
        baseFare: 300,
        pricePerKm: 200,
        pricePerMinute: 15
      },
      comfort: {
        baseFare: 500,
        pricePerKm: 250,
        pricePerMinute: 20
      },
      premium: {
        baseFare: 800,
        pricePerKm: 350,
        pricePerMinute: 25
      },
      xl: {
        baseFare: 1000,
        pricePerKm: 400,
        pricePerMinute: 30
      }
    }

    // Minimum fare
    this.minimumFare = 500
  }

  /**
   * Calculate ride price based on distance, duration, and vehicle type
   * @param {number} distanceKm - Distance in kilometers
   * @param {number} durationMinutes - Duration in minutes
   * @param {string} vehicleType - Type of vehicle (economy, comfort, premium, xl)
   * @param {Date} rideTime - Time of ride (for surge pricing)
   * @returns {Object} Pricing breakdown
   */
  calculatePrice (distanceKm, durationMinutes, vehicleType, rideTime = new Date()) {
    // Validate inputs
    if (distanceKm < 0) distanceKm = 0
    if (durationMinutes < 0) durationMinutes = 0
    if (!this.basePricing[vehicleType]) vehicleType = 'economy'

    const pricing = this.basePricing[vehicleType]

    // Calculate base price
    const distancePrice = distanceKm * pricing.pricePerKm
    const durationPrice = durationMinutes * pricing.pricePerMinute
    const basePrice = pricing.baseFare + distancePrice + durationPrice

    // Apply minimum fare
    const totalPrice = Math.max(basePrice, this.minimumFare)

    // Calculate surge multiplier (simplified - in reality this would be more complex)
    const surgeMultiplier = this.calculateSurgeMultiplier(rideTime)
    const surgePrice = totalPrice * surgeMultiplier

    return {
      basePricing: pricing,
      distancePrice,
      durationPrice,
      basePrice,
      surgeMultiplier,
      surgePrice,
      finalPrice: Math.round(surgePrice),
      minimumFareApplied: basePrice < this.minimumFare
    }
  }

  /**
   * Calculate surge multiplier based on time and demand
   * @param {Date} time - Time of ride
   * @returns {number} Surge multiplier (1.0 = no surge)
   */
  calculateSurgeMultiplier (time) {
    // Simplified surge pricing - in reality this would use real-time demand data
    const hour = time.getHours()
    const dayOfWeek = time.getDay() // 0 = Sunday, 6 = Saturday

    // Base multiplier
    let multiplier = 1.0

    // Peak hours (7-9 AM, 5-8 PM) on weekdays
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
        multiplier = 1.2
      }
    }
    // Weekend evenings
    else if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      if (hour >= 18 && hour <= 23) {
        multiplier = 1.3
      }
    }
    // Late night
    if (hour >= 22 || hour <= 5) {
      multiplier = Math.max(multiplier, 1.1)
    }

    return multiplier
  }

  /**
   * Get available vehicle types
   * @returns {Array} List of vehicle types with display names
   */
  getVehicleTypes () {
    return [
      { value: 'economy', label: 'Économique', description: 'Voiture standard pour 4 passagers' },
      { value: 'comfort', label: 'Confort', description: 'Voiture plus spacieuse et récente' },
      { value: 'premium', label: 'Premium', description: 'Voiture de luxe avec chauffeur professionnel' },
      { value: 'xl', label: 'XL', description: 'Van ou SUV pour 6+ passagers' }
    ]
  }

  /**
   * Validate vehicle type
   * @param {string} type - Vehicle type to validate
   * @returns {boolean} True if valid
   */
  isValidVehicleType (type) {
    return !!this.basePricing[type]
  }
}

module.exports = new PriceEstimationService()
