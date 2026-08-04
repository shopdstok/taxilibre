const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const Redis = require('ioredis')
const { logger } = require('../services/loggingService')
let io
let pubClient
let subClient

function initSocket (server) {
  // Initialize Socket.io server
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Initialize Redis adapter for horizontal scaling
  // Always attempt to use Redis for production scalability
  try {
    // Create Redis clients using ioredis as recommended
    pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      redisOptions: {
        // Enable keeping alive
        keepAlive: 30000,
        // Reconnect strategy
        retries: 10
      }
    })
    
    subClient = pubClient.duplicate()

    // Handle Redis connection events
    pubClient.on('error', (err) => {
      logger.warn('Redis pub client error:', err.message)
    })
    
    subClient.on('error', (err) => {
      logger.warn('Redis sub client error:', err.message)
    })

    pubClient.on('connect', () => {
      logger.info('Redis pub client connected')
    })
    
    subClient.on('connect', () => {
      logger.info('Redis sub client connected')
    })

    // Connect clients
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        // Apply Redis adapter
        io.adapter(createAdapter(pubClient, subClient))
        logger.info('✅ Socket.IO Redis adapter activated for horizontal scaling')
      })
      .catch((err) => {
        logger.warn('⚠️  Redis connection failed, falling back to in-memory adapter:', err.message)
        // Fallback to in-memory adapter if Redis connection fails
        io = new Server(server, {
          cors: {
            origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
          }
        })
      })
  } catch (err) {
    logger.warn('⚠️  Failed to initialize Redis clients, using in-memory adapter:', err.message)
    // Fallback to in-memory adapter
    io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    })
  }

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
      const decoded = await jwtService.verifyAccessToken(token)
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
    socket.join('user:' + socket.userId)

    // Join role-based rooms
    if (socket.userRole === 'driver') {
      socket.join('drivers')
      socket.join('driver:' + socket.userId)

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
            logger.warn('Failed to update driver location:', error.message)
          }
        }
      })

      // Handle ride acceptance
      socket.on('driver:accept_ride', async (data) => {
        const { rideId } = data
        if (rideId && socket.driverId) {
          const matchingService = require('../services/matchingService')
          try {
            await matchingService.handleAcceptRide({ rideId, driverId: socket.driverId })
          } catch (error) {
            logger.warn('Failed to accept ride:', error.message)
            socket.emit('ride:error', { message: 'Failed to accept ride', rideId })
          }
        }
      })
    }

    if (socket.userRole === 'passenger') {
      socket.join('passengers')
      socket.join('passenger:' + socket.userId)

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
            logger.warn('Failed to update passenger location:', error.message)
          }
        }
      })

      // Frontend emits 'ride_cancel' when passenger cancels a ride
      socket.on('ride_cancel', (data) => {
        const { rideId, reason } = data
        if (rideId) {
          io.to('ride:' + rideId).emit('ride_cancelled', {
            rideId,
            cancelledBy: 'passenger',
            reason: reason || 'Cancelled by passenger'
          })
        }
      })

      // Frontend emits 'ride_request' - acknowledge is handled via REST API
      socket.on('ride_request', (data) => {
        socket.emit('ride_request_received', { status: 'processing' })
      })
    }

    // Ride-specific events
    socket.on('join:ride', (rideId) => {
      socket.join('ride:' + rideId)
    })

    socket.on('leave:ride', (rideId) => {
      socket.leave('ride:' + rideId)
    })

    // Chat messages
    socket.on('chat:message', async (data) => {
      const { rideId, message } = data
      if (!rideId || !message) return

      // Save message to database (optional)
      // Broadcast to ride room
      io.to('ride:' + rideId).emit('chat:message', {
        userId: socket.userId,
        userName: socket.user.name,
        message,
        timestamp: new Date().toISOString()
      })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected:', socket.id, reason)

      // If driver, update status to offline if not in a ride
      if (socket.userRole === 'driver') {
        // Check if driver is currently in an active ride
        // For simplicity, we'll set to offline on disconnect
        // In production, you'd check active rides first
        const geolocationService = require('../services/geolocationService')
        geolocationService.stopTrackingDriver(socket.driverId).catch(err => {
          logger.warn('Failed to stop tracking driver on disconnect:', err.message)
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
