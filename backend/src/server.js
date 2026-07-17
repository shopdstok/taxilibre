const http = require('http')
const app = require('./app')
const { initSocket } = require('./socket')
const { logger } = require('./services/loggingService')

// Get port from environment or default to 3003
const PORT = process.env.PORT || 3003
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server
const server = http.createServer(app)

// Initialize Socket.IO
const io = initSocket(server)

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`)
  logger.info(`🔌 Socket.IO attached to server`)
  
  // Test database connection on startup
  const { sequelize } = require('./models')
  sequelize.authenticate()
    .then(() => logger.info('✅ Database connection established'))
    .catch(err => logger.error('❌ Unable to connect to database:', err))
})

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`)
    process.exit(1)
  } else {
    logger.error('❌ Server error:', error)
    process.exit(1)
  }
})

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully...')
  server.close(async (err) => {
    if (err) {
      logger.error('❌ Error during shutdown:', err)
      process.exit(1)
    }
    
    // Close database connections
    const { sequelize } = require('./models')
    await sequelize.close()
    
    logger.info('✅ Server closed')
    process.exit(0)
  })
})

module.exports = server
