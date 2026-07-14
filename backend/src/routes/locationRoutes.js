const express = require('express')
const router = express.Router()
const locationController = require('../controllers/locationController')
const { authenticateToken, requireDriver } = require('../middleware/authMiddleware')

/**
 * @route   GET /api/v1/location/address-from-coords
 * @desc    Get address from coordinates
 * @access   Public
 */
router.get('/address-from-coords', locationController.getAddressFromCoords)

/**
 * @route   GET /api/v1/location/coords-from-address
 * @desc    Get coordinates from address
 * @access   Public
 */
router.get('/coords-from-address', locationController.getCoordsFromAddress)

/**
 * @route   GET /api/v1/location/autocomplete
 * @desc    Autocomplete addresses
 * @access   Public
 */
router.get('/autocomplete', locationController.autocompleteAddress)

/**
 * @route   GET /api/v1/location/place/:placeId
 * @desc    Get place details
 * @access   Public
 */
router.get('/place/:placeId', locationController.getPlaceDetails)

/**
 * @route   POST /api/v1/location/distance
 * @desc    Calculate distance between two points
 * @access   Public
 */
router.post('/distance', locationController.calculateDistance)

/**
 * @route   POST /api/v1/location/distance-matrix
 * @desc    Get distance matrix
 * @access   Public
 */
router.post('/distance-matrix', locationController.getDistanceMatrix)

/**
 * @route   POST /api/v1/location/directions
 * @desc    Get directions between two points
 * @access   Public
 */
router.post('/directions', locationController.getDirections)

/**
 * @route   POST /api/v1/location/driver/tracking/start
 * @desc    Start tracking driver location
 * @access   Private (Driver)
 */
router.post('/driver/tracking/start', authenticateToken, requireDriver, locationController.startDriverTracking)

/**
 * @route   POST /api/v1/location/driver/tracking/stop
 * @desc    Stop tracking driver location
 * @access   Private (Driver)
 */
router.post('/driver/tracking/stop', authenticateToken, requireDriver, locationController.stopDriverTracking)

/**
 * @route   PUT /api/v1/location/driver
 * @desc    Update driver location
 * @access   Private (Driver)
 */
router.put('/driver', authenticateToken, requireDriver, locationController.updateDriverLocation)

/**
 * @route   GET /api/v1/location/driver/:driverId
 * @desc    Get driver location
 * @access   Private
 */
router.get('/driver/:driverId', authenticateToken, locationController.getDriverLocation)

/**
 * @route   PUT /api/v1/location/passenger
 * @desc    Update passenger location
 * @access   Private
 */
router.put('/passenger', authenticateToken, locationController.updatePassengerLocation)

/**
 * @route   GET /api/v1/location/nearby-drivers
 * @desc    Get nearby drivers
 * @access   Private
 */
router.get('/nearby-drivers', authenticateToken, locationController.getNearbyDrivers)

/**
 * @route   POST /api/v1/location/matching-drivers
 * @desc    Get matching drivers for ride
 * @access   Private
 */
router.post('/matching-drivers', authenticateToken, locationController.getMatchingDrivers)

/**
 * @route   POST /api/v1/location/route
 * @desc    Calculate route
 * @access   Private
 */
router.post('/route', authenticateToken, locationController.calculateRoute)

/**
 * @route   GET /api/v1/location/online-drivers-count
 * @desc    Get online drivers count
 * @access   Private
 */
router.get('/online-drivers-count', authenticateToken, locationController.getOnlineDriversCount)

module.exports = router
