const http = require('http')
const app = require('./app')
const { initSocket } = require('./socket')

// Get port from environment or default to 3003
const PORT = process.env.PORT || 3003
const HOST = process.env.HOST || '0.0.0.0'

// Create HTTP server
const server = http.createServer(app)

// Initialize Socket.IO
const io = initSocket(server)

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`)
  console.log(`🔌 Socket.IO attached to server`)
  
  // Test database connection on startup
  const { sequelize } = require('./models')
  sequelize.authenticate()
    .then(() => console.log('✅ Database connection established'))
    .catch(err => console.error('❌ Unable to connect to database:', err))
})

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`)
    process.exit(1)
  } else {
    console.error('❌ Server error:', error)
    process.exit(1)
  }
})

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error during shutdown:', err)
      process.exit(1)
    }
    
    // Close database connections
    const { sequelize } = require('./models')
    await sequelize.close()
    
    console.log('✅ Server closed')
    process.exit(0)
  })
})

module.exports = server
