const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { logger } = require('./services/loggingService');
const seedAdmin = require('../../scripts/seedAdmin');

// Get port from environment or default to 3003
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Fonction de demarrage avec seed admin
async function startServer() {
  try {
    // Tester et synchroniser la base de donnees
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Synchroniser les modeles
    await sequelize.sync({ alter: true });
    logger.info('Models synchronized');

    // Seed du compte admin unique
    await seedAdmin();
    logger.info('Admin seed verified');

    // Demarrer le serveur
    server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Socket.IO attached to server`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    // Demarrer quand meme sans seed (la base n est peut-etre pas encore prete)
    server.listen(PORT, HOST, () => {
      logger.warn(`Server running on http://${HOST}:${PORT} (sans seed admin)`);
    });
  }
}

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('\nShutting down gracefully...');
  server.close(async (err) => {
    if (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
    const { sequelize } = require('./models');
    await sequelize.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

// Demarrer
startServer();

module.exports = server;