const locationService = require('../services/locationService')
const geolocationService = require('../services/geolocationService')
const { sendSuccess, sendError } = require('../utils/response');
const AppError = require('../middleware/errorMiddleware').AppError;

/**
 * Get address from coordinates
 */
const getAddressFromCoords = async (req, res, next) => {
  try {
    const { lat, lng } = req.query

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDS')
    }

    const result = await locationService.getAddressFromCoords(parseFloat(lat), parseFloat(lng))

    return sendSuccess(res, result, 'Address retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get coordinates from address
 */
const getCoordsFromAddress = async (req, res, next) => {
  try {
    const { address } = req.query

    if (!address) {
      throw new AppError('Address is required', 400, 'MISSING_ADDRESS')
    }

    const result = await locationService.getCoordsFromAddress(address)

    return sendSuccess(res, result, 'Coordinates retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Autocomplete addresses
 */
const autocompleteAddress = async (req, res, next) => {
  try {
    const { input, lat, lng, radius } = req.query

    if (!input) {
      throw new AppError('Input is required', 400, 'MISSING_INPUT')
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
    const result = await locationService.autocompleteAddress(input, location, radius ? parseInt(radius) : null)

    return sendSuccess(res, result, 'Autocomplete results retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get place details
 */
const getPlaceDetails = async (req, res, next) => {
  try {
    const { placeId } = req.params

    if (!placeId) {
      throw new AppError('Place ID is required', 400, 'MISSING_PLACE_ID')
    }

    const result = await locationService.getPlaceDetails(placeId)

    return sendSuccess(res, result, 'Place details retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Calculate distance
 */
const calculateDistance = async (req, res, next) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.body

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      throw new AppError('All coordinates are required', 400, 'MISSING_COORDS')
    }

    const result = locationService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lng1),
      parseFloat(lat2),
      parseFloat(lng2)
    )

    return sendSuccess(res, result, 'Distance calculated successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get distance matrix
 */
const getDistanceMatrix = async (req, res, next) => {
  try {
    const { origins, destinations, mode } = req.body

    if (!origins || !destinations) {
      throw new AppError('Origins and destinations are required', 400, 'MISSING_LOCATIONS')
    }

    const result = await locationService.getDistanceMatrix(origins, destinations, mode || 'driving')

    return sendSuccess(res, result, 'Distance matrix retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get directions
 */
const getDirections = async (req, res, next) => {
  try {
    const { origin, destination, waypoints, mode } = req.body

    if (!origin || !destination) {
      throw new AppError('Origin and destination are required', 400, 'MISSING_LOCATIONS')
    }

    const result = await locationService.getDirections(
      origin,
      destination,
      waypoints || [],
      mode || 'driving'
    )

    return sendSuccess(res, result, 'Directions retrieved successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Start tracking driver location
 */
const startDriverTracking = async (req, res, next) => {
  try {
    const { lat, lng } = req.body
    const driverId = req.driverId

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDS')
    }

    const result = await geolocationService.startTrackingDriver(driverId, { lat, lng })

    return sendSuccess(res, result, 'Driver tracking started', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Stop tracking driver location
 */
const stopDriverTracking = async (req, res, next) => {
  try {
    const driverId = req.driverId

    const result = await geolocationService.stopTrackingDriver(driverId)

    return sendSuccess(res, result, 'Driver tracking stopped', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Update driver location
 */
const updateDriverLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body
    const driverId = req.driverId

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDS')
    }

    const result = await geolocationService.updateDriverLocation(driverId, { lat, lng })

    return sendSuccess(res, result, 'Driver location updated', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get driver location
 */
const getDriverLocation = async (req, res, next) => {
  try {
    const { driverId } = req.params

    const result = await geolocationService.getDriverLocation(driverId)

    if (!result) {
      throw new AppError('Driver location not found', 404, 'LOCATION_NOT_FOUND')
    }

    return sendSuccess(res, result, 'Driver location retrieved', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Update passenger location
 */
const updatePassengerLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body
    const userId = req.userId

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDS')
    }

    const result = await geolocationService.updatePassengerLocation(userId, { lat, lng })

    return sendSuccess(res, result, 'Passenger location updated', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get nearby drivers
 */
const getNearbyDrivers = async (req, res, next) => {
  try {
    const { lat, lng, radius, limit, vehicleType } = req.query

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDS')
    }

    const result = await geolocationService.getNearbyDrivers(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius ? parseInt(radius) : undefined,
      limit ? parseInt(limit) : undefined
    )

    // Filter by vehicle type if specified
    let filteredDrivers = result
    if (vehicleType) {
      filteredDrivers = result.filter(d => d.vehicle === vehicleType)
    }

    return sendSuccess(res, filteredDrivers, 'Nearby drivers retrieved', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get matching drivers for ride
 */
const getMatchingDrivers = async (req, res, next) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType, limit } = req.body

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      throw new AppError('Pickup and dropoff coordinates are required', 400, 'MISSING_COORDS')
    }

    const result = await geolocationService.getMatchingDrivers(
      { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
      { lat: parseFloat(dropoffLat), lng: parseFloat(dropoffLng) },
      {
        vehicleType,
        limit: limit ? parseInt(limit) : 5
      }
    )

    return sendSuccess(res, result, 'Matching drivers retrieved', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Calculate route
 */
const calculateRoute = async (req, res, next) => {
  try {
    const { origin, destination } = req.body

    if (!origin || !destination) {
      throw new AppError('Origin and destination are required', 400, 'MISSING_LOCATIONS')
    }

    const result = await geolocationService.calculateRoute(origin, destination)

    return sendSuccess(res, result, 'Route calculated successfully', 200)
  } catch (error) {
    next(error)
  }
}

/**
 * Get online drivers count
 */
const getOnlineDriversCount = async (req, res, next) => {
  try {
    const count = await geolocationService.getOnlineDriversCount()

    return sendSuccess(res, { count }, 'Online drivers count retrieved', 200)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAddressFromCoords,
  getCoordsFromAddress,
  autocompleteAddress,
  getPlaceDetails,
  calculateDistance,
  getDistanceMatrix,
  getDirections,
  startDriverTracking,
  stopDriverTracking,
  updateDriverLocation,
  getDriverLocation,
  updatePassengerLocation,
  getNearbyDrivers,
  getMatchingDrivers,
  calculateRoute,
  getOnlineDriversCount
}
