const { Server } = require('socket.io')
let io

function initSocket (server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  })

  // Initialize socket service with IO instance
  const socketService = require('../services/socketService')
  socketService.initialize(io)

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      const jwtService = require('../services/jwtService')
      const decoded = jwtService.verifyAccessToken(token)
      const { User, Driver } = require('../models')
      const user = await User.findByPk(decoded.id, {
        include: [{
          model: Driver,
          as: 'driver'
        }]
      })
      if (!user) {
        return next(new Error('Invalid user'))
      }
      socket.user = user
      socket.userId = user.id
      socket.userRole = user.role
      // Set driverId for driver users
      if (user.role === 'driver' && user.driver) {
        socket.driverId = user.driver.id
      }
      next()
    } catch (error) {
      return next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {

    // Join user-specific room
    socket.join(`user:${socket.userId}`)

    // Join role-based rooms
    if (socket.userRole === 'driver') {
      socket.join('drivers')
      socket.join(`driver:${socket.userId}`)

      // Handle driver location updates
      socket.on('driver:location_update', async (data) => {
        const { latitude, longitude } = data
        if (latitude && longitude) {
          const matchingService = require('../services/matchingService')
          try {
            await matchingService.updateDriverLocation(socket.userId, parseFloat(latitude), parseFloat(longitude))

            // Note: The matching service handles Redis GEO updates for matching logic
            // Real-time location updates to passengers are handled by the matching service
            // through Socket.io notifications when needed (e.g., during active rides)
          } catch (error) {
          }
        }
      })

      // Handle ride acceptance
      socket.on('accept-ride', async (data) => {
        const { rideId } = data
        if (rideId) {
          const matchingService = require('../services/matchingService')
          try {
            await matchingService.handleAcceptRide({ rideId, driverId: socket.userId })
            // The matching service handles notifications to both passenger and driver
          } catch (error) {
            socket.emit('accept-ride-error', { message: 'Failed to accept ride' })
          }
        }
      })
    }

    if (socket.userRole === 'passenger') {
      socket.join('passengers')
      socket.join(`passenger:${socket.userId}`)

      // Handle passenger location updates
      socket.on('passenger:location_update', async (data) => {
        const { latitude, longitude } = data
        if (latitude && longitude) {
          const geolocationService = require('../services/geolocationService')
          try {
            await geolocationService.updatePassengerLocation(socket.userId, {
              lat: parseFloat(latitude),
              lng: parseFloat(longitude)
            })
          } catch (error) {
          }
        }
      })
    }

    // Ride-specific events
    socket.on('join:ride', (rideId) => {
      socket.join(`ride:${rideId}`)
    })

    socket.on('leave:ride', (rideId) => {
      socket.leave(`ride:${rideId}`)
    })

    // Chat messages
    socket.on('chat:message', async (data) => {
      const { rideId, message } = data
      if (!rideId || !message) return

      // Save message to database (optional)
      // Broadcast to ride room
      io.to(`ride:${rideId}`).emit('chat:message', {
        userId: socket.userId,
        userName: socket.user.name,
        message,
        timestamp: new Date().toISOString()
      })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {

      // If driver, update status to offline if not in a ride
      if (socket.userRole === 'driver') {
        // Check if driver is currently in an active ride
        // For simplicity, we'll set to offline on disconnect
        // In production, you'd check active rides first
        const geolocationService = require('../services/geolocationService')
        geolocationService.stopTrackingDriver(socket.driverId).catch(err => {
        })
      }
    })
  })

  return io
}

function getIO () {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}

// Helper function to get nearby passengers (simplified)
async function getNearbyPassengers (location, radius) {
  // In a real implementation, this would use geospatial queries
  // For now, return empty array
  return []
}

module.exports = { initSocket, getIO }
