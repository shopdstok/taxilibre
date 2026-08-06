const { Client } = require('@googlemaps/google-maps-services-js')
const { logger } = require('../services/loggingService')

/**
 * Google Maps API client configuration
 * Uses @googlemaps/google-maps-services-js library
 */

const apiKey = process.env.GOOGLE_MAPS_API_KEY

if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
  logger.warn('GOOGLE_MAPS_API_KEY not set or using placeholder. Google Maps features will not work.')
}

const client = new Client({})

/**
 * Distance Matrix API wrapper
 * @param {Object} params - Distance Matrix API parameters
 * @returns {Promise<Object>} API response
 */
const distanceMatrix = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured')
  }
  
  try {
    const response = await client.distancematrix({
      params: {
        ...params,
        key: apiKey
      },
      timeout: 10000 // 10 second timeout
    })
    return response.data
  } catch (error) {
    logger.error('Google Maps Distance Matrix API error:', error.message)
    throw error
  }
}

/**
 * Geocoding API wrapper
 * @param {Object} params - Geocoding API parameters
 * @returns {Promise<Object>} API response
 */
const geocode = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured')
  }
  
  try {
    const response = await client.geocode({
      params: {
        ...params,
        key: apiKey
      },
      timeout: 10000 // 10 second timeout
    })
    return response.data
  } catch (error) {
    logger.error('Google Maps Geocoding API error:', error.message)
    throw error
  }
}

/**
 * Places API wrapper (for autocomplete, place details, etc.)
 * @param {Object} params - Places API parameters
 * @returns {Promise<Object>} API response
 */
const places = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured')
  }
  
  try {
    const response = await client.places({
      params: {
        ...params,
        key: apiKey
      },
      timeout: 10000
    })
    return response.data
  } catch (error) {
    logger.error('Google Maps Places API error:', error.message)
    throw error
  }
}

/**
 * Directions API wrapper
 * @param {Object} params - Directions API parameters
 * @returns {Promise<Object>} API response
 */
const directions = async (params) => {
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    throw new Error('Google Maps API key not configured')
  }
  
  try {
    const response = await client.directions({
      params: {
        ...params,
        key: apiKey
      },
      timeout: 10000
    })
    return response.data
  } catch (error) {
    logger.error('Google Maps Directions API error:', error.message)
    throw error
  }
}

module.exports = {
  client,
  distanceMatrix,
  geocode,
  places,
  directions,
  // Helper to check if Google Maps is configured
  isConfigured: () => !!(apiKey && apiKey !== 'your-google-maps-api-key-here')
}
