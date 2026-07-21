const { logger } = require('./loggingService')

/**
 * Socket service for managing real-time connections and events
 */
class SocketService {
  constructor () {
    this.connectedUsers = new Map()
    this.connectedDrivers = new Map()
    this.activeRides = new Map()
    this.io = null
  }

  /**
   * Initialize socket service
   */
  initialize (io) {
    this.io = io

    io.on('connection', (socket) => {
      // Store connection info based on user role from handshake
      const userId = socket.handshake.auth.userId
      const userRole = socket.handshake.auth.userRole

      if (userId && userRole === 'driver') {
        this.connectedDrivers.set(userId, socket.id)
        socket.join(`driver:${userId}`)
        logger.info(`Driver connected: ${userId}`, { socketId: socket.id })
      } else if (userId && userRole === 'passenger') {
        this.connectedUsers.set(userId, socket.id)
        socket.join(`passenger:${userId}`)
        logger.info(`Passenger connected: ${userId}`, { socketId: socket.id })
      }

      // Join user-specific room for general notifications
      if (userId) {
        socket.join(`user:${userId}`)
      }

      socket.on('disconnect', (reason) => {
        logger.info(`User disconnected: ${userId || 'unknown'}`, {
          reason,
          socketId: socket.id
        })

        // Clean up connection maps
        if (userId && userRole === 'driver') {
          this.connectedDrivers.delete(userId)
        } else if (userId && userRole === 'passenger') {
          this.connectedUsers.delete(userId)
        }
      })
    })

  }

  /**
   * Send notification to specific user
   */
  sendToUser (userId, event, data) {
    const socketId = this.connectedUsers.get(userId)
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data)
    }
  }

  /**
   * Send notification to specific driver
   */
  sendToDriver (driverId, event, data) {
    const socketId = this.connectedDrivers.get(driverId)
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data)
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcastToAll (event, data) {
    if (this.io) {
      this.io.emit(event, data)
    }
  }

  /**
   * Broadcast to all connected drivers
   */
  broadcastToDrivers (event, data) {
    if (this.io) {
      const driverSocketIds = Array.from(this.connectedDrivers.values())
      driverSocketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data)
      })
    }
  }

  /**
   * Broadcast to all connected passengers
   */
  broadcastToPassengers (event, data) {
    if (this.io) {
      const passengerSocketIds = Array.from(this.connectedUsers.values())
      passengerSocketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data)
      })
    }
  }

  /**
   * Send ride request to nearby drivers
   */
  sendRideRequestToNearbyDrivers (rideData, nearbyDrivers) {
    nearbyDrivers.forEach(driver => {
      const socketId = this.connectedDrivers.get(driver.id)
      if (socketId && this.io) {
        this.io.to(socketId).emit('ride:requested', {
          rideId: rideData.rideId,
          passengerId: rideData.passengerId,
          pickup: rideData.pickup,
          dropoff: rideData.dropoff,
          estimatedPrice: rideData.estimatedPrice,
          paymentMethod: rideData.paymentMethod,
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 1000).toISOString() // 30 seconds timeout
        })
      }
    })
  }

  /**
   * Update driver status for all passengers
   */
  updateDriverStatusForPassengers (driverId, status, location = null) {
    const updateData = {
      driverId,
      status,
      timestamp: new Date().toISOString()
    }

    if (location) {
      updateData.location = location
    }

    this.broadcastToPassengers('driver:status:updated', updateData)
  }

  /**
   * Send ride status update to relevant users
   */
  sendRideStatusUpdate (rideId, status, data = {}) {
    const ride = this.activeRides.get(rideId)
    if (!ride) return

    const updateData = {
      rideId,
      status,
      timestamp: new Date().toISOString(),
      ...data
    }

    // Send to passenger
    this.sendToUser(ride.passengerId, 'ride:status:updated', updateData)

    // Send to driver if assigned
    if (ride.driverId) {
      this.sendToDriver(ride.driverId, 'ride:status:updated', updateData)
    }
  }

  /**
   * Handle driver location update
   */
  handleDriverLocationUpdate (driverId, location) {
    // Update stored location
    const driverSocketId = this.connectedDrivers.get(driverId)
    if (driverSocketId) {
      // Broadcast to passengers tracking this driver
      this.broadcastToPassengers('driver:location:updated', {
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats () {
    return {
      connectedUsers: this.connectedUsers.size,
      connectedDrivers: this.connectedDrivers.size,
      activeRides: this.activeRides.size,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Disconnect user
   */
  disconnectUser (userId, role) {
    if (role === 'driver') {
      this.connectedDrivers.delete(userId)
    } else {
      this.connectedUsers.delete(userId)
    }
  }

  /**
   * Get active rides for user
   */
  getActiveRidesForUser (userId) {
    const userRides = []
    this.activeRides.forEach((ride, rideId) => {
      if (ride.passengerId === userId || ride.driverId === userId) {
        userRides.push({ rideId, ...ride })
      }
    })
    return userRides
  }

  /**
   * Add active ride
   */
  addActiveRide (rideId, rideData) {
    this.activeRides.set(rideId, rideData)
  }

  /**
   * Remove active ride
   */
  removeActiveRide (rideId) {
    this.activeRides.delete(rideId)
  }

  /**
   * Get driver by socket ID
   */
  getDriverBySocketId (socketId) {
    for (const [driverId, driverSocketId] of this.connectedDrivers.entries()) {
      if (driverSocketId === socketId) {
        return driverId
      }
    }
    return null
  }

  /**
   * Get user by socket ID
   */
  getUserBySocketId (socketId) {
    for (const [userId, userSocketId] of this.connectedUsers.entries()) {
      if (userSocketId === socketId) {
        return userId
      }
    }
    return null
  }

  /**
   * Send emergency notification
   */
  sendEmergencyNotification (rideId, emergencyType, data) {
    const ride = this.activeRides.get(rideId)
    if (!ride) return

    const emergencyData = {
      rideId,
      emergencyType,
      timestamp: new Date().toISOString(),
      ...data
    }

    // Send to both passenger and driver
    this.sendToUser(ride.passengerId, 'emergency:notification', emergencyData)
    if (ride.driverId) {
      this.sendToDriver(ride.driverId, 'emergency:notification', emergencyData)
    }

    // Also send to admin users
    this.broadcastToAll('emergency:alert', emergencyData)
  }

  /**
   * Send system notification
   */
  sendSystemNotification (message, type = 'info', targetUsers = null) {
    const notification = {
      message,
      type,
      timestamp: new Date().toISOString()
    }

    if (targetUsers === 'drivers') {
      this.broadcastToDrivers('system:notification', notification)
    } else if (targetUsers === 'passengers') {
      this.broadcastToPassengers('system:notification', notification)
    } else {
      this.broadcastToAll('system:notification', notification)
    }
  }

  /**
   * Clean up expired ride requests
   */
  cleanupExpiredRideRequests () {
    const now = new Date()
    const expiredRides = []

    this.activeRides.forEach((ride, rideId) => {
      if (ride.status === 'requested' && ride.expiresAt && new Date(ride.expiresAt) < now) {
        expiredRides.push(rideId)
      }
    })

    expiredRides.forEach(rideId => {
      this.removeActiveRide(rideId)
      this.sendRideStatusUpdate(rideId, 'expired', { reason: 'Request timeout' })
    })

    return expiredRides.length
  }
}

// Create singleton instance
const socketService = new SocketService()

module.exports = socketService
