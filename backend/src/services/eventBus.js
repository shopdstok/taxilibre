let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    xAdd: async () => ({}),
    publish: async () => {},
    duplicate: () => ({
      subscribe: async () => {},
      on: () => {}
    }),
    xGroupCreate: async () => {},
    xReadGroup: async () => [],
    xAck: async () => {}
  }
}

/**
 * Event-Driven Architecture using Redis Streams
 * Pub/Sub pattern for decoupled microservices communication
 */
class EventBus {
  constructor () {
    this.subscribers = new Map()
    this.streamKey = 'taxilibre:events'
  }

  /**
   * Publish event to stream
   */
  async publish (eventType, payload) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      payload
    }

    try {
      // Add to Redis Stream
      await redis.xAdd(this.streamKey, '*', {
        event: JSON.stringify(event)
      })

      // Also publish for real-time subscribers
      await redis.publish(`events:${eventType}`, JSON.stringify(event))

      return { success: true, eventId: event.id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Subscribe to specific event type
   */
  async subscribe (eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }

    this.subscribers.get(eventType).push(handler)

    // Start listening to Redis Pub/Sub
    const subscriber = redis.duplicate()
    await subscriber.subscribe(`events:${eventType}`)

    subscriber.on('message', (channel, message) => {
      const event = JSON.parse(message)
      handler(event)
    })

  }

  /**
   * Process events from stream (for workers)
   */
  async processEvents (group, consumer, count = 10) {
    try {
      // Create consumer group if not exists
      try {
        await redis.xGroupCreate(this.streamKey, group, '$', {
          MKSTREAM: true
        })
      } catch (err) {
        // Group already exists
        if (!err.message.includes('already exists')) {
          throw err
        }
      }

      // Read events
      const events = await redis.xReadGroup(
        group,
        consumer,
        [{ key: this.streamKey, id: '>' }],
        { COUNT: count, BLOCK: 5000 }
      )

      if (!events) return []

      return events.map(e => ({
        id: e.id,
        ...JSON.parse(e.message.event)
      }))
    } catch (error) {
      return []
    }
  }

  /**
   * Acknowledge event processed
   */
  async acknowledge (group, eventId) {
    await redis.xAck(this.streamKey, group, eventId)
  }

  // ==================== RIDE EVENTS ====================

  static async rideRequested (rideData) {
    const bus = new EventBus()
    return bus.publish('RIDE_REQUESTED', {
      rideId: rideData.id,
      passengerId: rideData.passengerId,
      pickupLat: rideData.pickupLatitude,
      pickupLng: rideData.pickupLongitude,
      dropoffLat: rideData.dropoffLatitude,
      dropoffLng: rideData.dropoffLongitude,
      vehicleType: rideData.vehicleType,
      estimatedPrice: rideData.totalPrice
    })
  }

  static async rideAccepted (rideId, driverId, driverData) {
    const bus = new EventBus()
    return bus.publish('RIDE_ACCEPTED', {
      rideId,
      driverId,
      driverName: driverData.name,
      driverRating: driverData.rating,
      licensePlate: driverData.vehicle?.licensePlate,
      eta: driverData.estimatedArrival
    })
  }

  static async rideStarted (rideId, driverId, passengerId) {
    const bus = new EventBus()
    return bus.publish('RIDE_STARTED', {
      rideId,
      driverId,
      passengerId,
      startedAt: new Date().toISOString()
    })
  }

  static async rideCompleted (rideId, finalPrice, distance, duration) {
    const bus = new EventBus()
    return bus.publish('RIDE_COMPLETED', {
      rideId,
      finalPrice,
      actualDistance: distance,
      actualDuration: duration,
      completedAt: new Date().toISOString()
    })
  }

  static async driverLocationUpdated (driverId, lat, lng, status) {
    const bus = new EventBus()
    return bus.publish('DRIVER_LOCATION_UPDATED', {
      driverId,
      latitude: lat,
      longitude: lng,
      status,
      timestamp: new Date().toISOString()
    })
  }

  static async paymentProcessed (rideId, paymentId, amount, status) {
    const bus = new EventBus()
    return bus.publish('PAYMENT_PROCESSED', {
      rideId,
      paymentId,
      amount,
      status,
      processedAt: new Date().toISOString()
    })
  }

  static async userRegistered (userId, email, role) {
    const bus = new EventBus()
    return bus.publish('USER_REGISTERED', {
      userId,
      email,
      role,
      registeredAt: new Date().toISOString()
    })
  }
}

module.exports = EventBus
