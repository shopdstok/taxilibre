// Ride status enum constants
const RideStatus = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  DRIVER_ARRIVING: 'driver_arriving',
  DRIVER_ARRIVED: 'driver_arrived',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  CANCELLED: 'cancelled',
  NO_DRIVER_AVAILABLE: 'no_driver_available',
  EXPIRED: 'expired'
};

module.exports = { RideStatus };
