/**
 * ENHANCED RIDE CONTROLLER - DISABLED
 * This controller was replaced by rideController.js due to incompatible status values
 * and calls to non-existent service functions.
 * 
 * All ride lifecycle operations are now handled by: rideController.js
 */
const rideController = require('./rideController');
const { logger } = require('../services/loggingService');

// Re-export standard controller with deprecation logging
const handler = (fn) => (req, res, next) => {
  logger.warn('DEPRECATED endpoint: enhancedRideController is disabled. Use standard rideController endpoints.', {
    path: req.path, method: req.method
  });
  return fn(req, res, next);
};

module.exports = {
  requestRide: handler(rideController.requestRide),
  acceptRide: handler(rideController.acceptRide),
  startRide: handler(rideController.startRide),
  completeRide: handler(rideController.completeRide),
  getRideDetails: handler(rideController.getRide),
  getRideHistory: handler(rideController.getUserRides),
  cancelRide: handler(rideController.cancelRide)
};
