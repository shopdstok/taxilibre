const EventBus = require('../services/eventBus')
const PushNotificationService = require('../services/pushNotificationService')
const { Ride, User, Driver } = require('../models')

/**
 * Background Worker for processing events from Redis Streams
 * Handles notifications, matching, and background tasks
 */
class NotificationWorker {
  constructor () {
    this.eventBus = new EventBus()
    this.group = 'notification-workers'
    this.consumer = `worker-${process.pid}`
    this.isRunning = false
  }

  /**
   * Start the worker
   */
  async start () {
    if (this.isRunning) return

    this.isRunning = true

    while (this.isRunning) {
      try {
        const events = await this.eventBus.processEvents(
          this.group,
          this.consumer,
          10
        )

        for (const event of events) {
          await this.handleEvent(event)
          await this.eventBus.acknowledge(this.group, event.id)
        }
      } catch (error) {
        await this.sleep(5000)
      }
    }
  }

  /**
   * Stop the worker
   */
  stop () {
    this.isRunning = false
  }

  /**
   * Handle different event types
   */
  async handleEvent (event) {

    switch (event.type) {
      case 'RIDE_REQUESTED':
        await this.handleRideRequested(event.payload)
        break
      case 'RIDE_ACCEPTED':
        await this.handleRideAccepted(event.payload)
        break
      case 'DRIVER_ARRIVED':
        await this.handleDriverArrived(event.payload)
        break
      case 'RIDE_STARTED':
        await this.handleRideStarted(event.payload)
        break
      case 'RIDE_COMPLETED':
        await this.handleRideCompleted(event.payload)
        break
      case 'PAYMENT_PROCESSED':
        await this.handlePaymentProcessed(event.payload)
        break
      default:
    }
  }

  /**
   * Handle ride requested - notify nearby drivers
   */
  async handleRideRequested (payload) {
    const { rideId, passengerId, pickupLat, pickupLng, estimatedPrice } = payload

    try {
      const ride = await Ride.findByPk(rideId, {
        include: [
          { model: User, as: 'passenger', attributes: ['id', 'name'] }
        ]
      })

      if (!ride) return

      // TODO: Get nearby drivers from matching service
      // For now, broadcast to all online drivers
      const { matchingService } = require('./matchingService')
      const nearbyDrivers = await matchingService.findNearbyDrivers(
        pickupLat,
        pickupLng,
        { radiusKm: 5, maxDrivers: 10 }
      )

      // Notify each nearby driver
      for (const driver of nearbyDrivers) {
        await PushNotificationService.notifyNewRideRequest(driver.id, {
          rideId,
          pickupAddress: ride.pickupAddress,
          estimatedPrice
        })
      }

    } catch (error) {
    }
  }

  /**
   * Handle ride accepted - notify passenger
   */
  async handleRideAccepted (payload) {
    const { rideId, driverId, driverName, driverRating, licensePlate, eta } = payload

    try {
      const ride = await Ride.findByPk(rideId)
      if (!ride) return

      await PushNotificationService.notifyRideAccepted(ride.passengerId, {
        rideId,
        driverName,
        driverRating,
        licensePlate,
        eta
      })

    } catch (error) {
    }
  }

  /**
   * Handle driver arrived - notify passenger
   */
  async handleDriverArrived (payload) {
    const { rideId, driverId } = payload

    try {
      const ride = await Ride.findByPk(rideId, {
        include: [
          { model: Driver, as: 'driver', include: ['user'] },
          { model: User, as: 'passenger' }
        ]
      })

      if (!ride || !ride.driver) return

      await PushNotificationService.notifyDriverArriving(ride.passengerId, {
        rideId,
        driverName: ride.driver.user.name,
        licensePlate: ride.driver.vehicles?.[0]?.licensePlate || 'N/A'
      })

    } catch (error) {
    }
  }

  /**
   * Handle ride started - notify passenger
   */
  async handleRideStarted (payload) {
    const { rideId, driverId, passengerId } = payload

    try {
      const ride = await Ride.findByPk(rideId)
      if (!ride) return

      await PushNotificationService.notifyRideStarted(ride.passengerId, {
        rideId,
        destination: ride.dropoffAddress
      })

    } catch (error) {
    }
  }

  /**
   * Handle ride completed - notify passenger and driver
   */
  async handleRideCompleted (payload) {
    const { rideId, finalPrice, actualDistance, actualDuration } = payload

    try {
      const ride = await Ride.findByPk(rideId, {
        include: [
          { model: User, as: 'passenger' },
          { model: Driver, as: 'driver' }
        ]
      })

      if (!ride) return

      // Notify passenger
      await PushNotificationService.notifyRideCompleted(ride.passengerId, {
        rideId,
        totalPrice: finalPrice,
        ratingNeeded: !ride.driverRating
      })

      // Notify driver
      if (ride.driver) {
        await PushNotificationService.sendToUser(ride.driver.userId, {
          title: 'Course terminée',
          body: `Revenu: ${finalPrice}€ pour ${actualDistance}km`,
          data: { type: 'RIDE_COMPLETED_DRIVER', rideId, earnings: finalPrice }
        })
      }

    } catch (error) {
    }
  }

  /**
   * Handle payment processed
   */
  async handlePaymentProcessed (payload) {
    const { rideId, paymentId, amount, status } = payload

    if (status === 'paid') {
      // Could send receipt email here
    }
  }

  /**
   * Sleep helper
   */
  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton
module.exports = new NotificationWorker()
