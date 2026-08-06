const { distanceMatrix, geocode } = require('../config/googleMaps')
const { logger } = require('./loggingService')
const { etherscan, ethPriceUsd } = require('./etherscanService')

/**
 * Location Service for handling geocoding, distance calculations, and ETA estimations
 * Integrates with Google Maps Distance Matrix API and Ethereum gas price tracking
 */
class LocationService {
  /**
   * Get distance and duration between two points using Google Maps Distance Matrix API
   * @param {Object} origin - { lat, lng }
   * @param {Object} destination - { lat, lng }
   * @returns {Promise<Object>} distance in meters, duration in seconds
   */
  async getDistanceMatrix (origin, destination) {
    try {
      if (!origin || !destination) {
        throw new Error('Origin and destination are required')
      }

      const response = await distanceMatrix({
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        travelMode: 'DRIVING',
        
        avoidHighways: false,
        avoidTolls: false
      })

      if (response.rows[0].elements[0].status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${response.rows[0].elements[0].status}`)
      }

      const element = response.rows[0].elements[0]
      return {
        distance: element.distance.value, // in meters
        duration: element.duration.value, // in seconds
        status: element.status
      }
    } catch (error) {
      logger.error('Error in getDistanceMatrix', { error, origin, destination })
      throw error
    }
  }

  /**
   * Get address from coordinates using Google Maps Geocoding API
   * @param {Object} location - { lat, lng }
   * @returns {Promise<string>} formatted address
   */
  async getAddressFromCoordinates (location) {
    try {
      if (!location) {
        throw new Error('Location is required')
      }

      const response = await geocode({
        location: `${location.lat},${location.lng}`
      })

      if (response.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      return response.results[0].formatted_address
    } catch (error) {
      logger.error('Error in getAddressFromCoordinates', { error, location })
      throw error
    }
  }

  /**
   * Get coordinates from address using Google Maps Geocoding API
   * @param {string} address
   * @returns {Promise<Object>} { lat, lng }
   */
  async getCoordinatesFromAddress (address) {
    try {
      if (!address) {
        throw new Error('Address is required')
      }

      const response = await geocode({ address })

      if (response.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const location = response.results[0].geometry.location
      return {
        lat: location.lat(),
        lng: location.lng()
      }
    } catch (error) {
      logger.error('Error in getCoordinatesFromAddress', { error, address })
      throw error
    }
  }

  /**
   * Calculate estimated time of arrival based on distance and current traffic
   * @param {Object} origin - { lat, lng }
   * @param {Object} destination - { lat, lng }
   * @returns {Promise<Object>} ETA in minutes and distance in km
   */
  async calculateETA (origin, destination) {
    try {
      const { distance, duration } = await this.getDistanceMatrix(origin, destination)
      const distanceKm = distance / 1000
      const etaMinutes = Math.ceil(duration / 60)

      return {
        etaMinutes,
        distanceKm: parseFloat(distanceKm.toFixed(1)),
        durationSeconds: duration
      }
    } catch (error) {
      logger.error('Error in calculateETA', { error, origin, destination })
      throw error
    }
  }

  /**
   * Get current gas price from Ethereum blockchain (for pricing calculations if needed)
   * @returns {Promise<Object>} gas price in Gwei and USD
   */
  async getGasPrice () {
    try {
      const gasWei = await etherscan.getGasPrice()
      const gasGwei = Number(etherscan.utils.formatUnits(gasWei, 'gwei'))
      const gasUsd = (gasWei * ethPriceUsd) / 1e18

      return {
        gasGwei: parseFloat(gasGwei.toFixed(1)),
        gasUsd: parseFloat(gasUsd.toFixed(2))
      }
    } catch (error) {
      logger.error('Error in getGasPrice', { error })
      // Return fallback values
      return {
        gasGwei: 20,
        gasUsd: 0.50
      }
    }
  }

  /**
   * Calculate surge pricing multiplier based on time of day and demand
   * @param {Date} date - optional date, defaults to now
   * @returns {number} multiplier (1.0 = no surge)
   */
  getSurgeMultiplier (date = new Date()) {
    const hour = date.getHours()
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    // Base multiplier
    let multiplier = 1.0

    // Weekday rush hours (7-9 AM, 4-7 PM)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
        multiplier = 1.3
      }
    }
    // Weekend evenings (Friday 6PM - Sunday 12AM)
    else if ((dayOfWeek === 5 && hour >= 18) || // Friday evening
             (dayOfWeek === 6) || // Saturday all day
             (dayOfWeek === 0 && hour < 12)) { // Sunday morning
      multiplier = 1.2
    }
    // Late night (12AM-5AM)
    if (hour >= 0 && hour <= 5) {
      multiplier = Math.max(multiplier, 1.1)
    }

    return parseFloat(multiplier.toFixed(2))
  }
}

module.exports = new LocationService()

