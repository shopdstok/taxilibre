const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { logger } = require('./services/loggingService');
const seedAdmin = require('../scripts/seedAdmin');
const { sequelize } = require('./models');
const path = require('path');
const fs = require('fs');

// Get port from environment or default to 3003
let PORT = process.env.PORT || 3003;
let HOST = process.env.HOST || '0.0.0.0';

// Override if PORT and HOST were mistakenly set to Redis values
if (process.env.REDIS_PORT && process.env.PORT === process.env.REDIS_PORT) {
  console.warn(`Detected PORT matching REDIS_PORT (${process.env.REDIS_PORT}), overriding to default`);
  PORT = 3003;
}
if (process.env.REDIS_HOST && process.env.HOST === process.env.REDIS_HOST) {
  console.warn(`Detected HOST matching REDIS_HOST (${process.env.REDIS_HOST}), overriding to 0.0.0.0`);
  HOST = '0.0.0.0';
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Function to run SQL migration files in order
const runMigrations = async () => {
  const migrationsDirPath = path.join(__dirname, '..', 'database', 'migrations');
  try {
    const files = fs.readdirSync(migrationsDirPath);
    // Filter for .sql files and sort by name (assuming they are numbered)
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDirPath, file);
      let sql = fs.readFileSync(filePath, 'utf8');
      // Remove comments that start with -- (single line) to avoid issues with splitting
      // But we'll keep it simple and split by semicolon
      const statements = sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
      for (const statement of statements) {
        await sequelize.query(statement, { logging: msg => logger.debug(msg) });
      }
      logger.info(`Executed migration: ${file}`);
    }
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
};

// Fonction de demarrage avec seed admin
async function startServer() {
  try {
    // Tester la connexion a la base de donnees
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Executer les migrations SQL
    await runMigrations();
    logger.info('SQL migrations executed');

    // Synchroniser les modeles (sans alteration, car les migrations ont deja mis a jour le schema)
    await sequelize.sync();
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
    logger.error('Failed to start server:', error);
    console.error(error.stack || error);
    // En cas d'echec, on ne démarre pas le serveur
    process.exit(1);
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
