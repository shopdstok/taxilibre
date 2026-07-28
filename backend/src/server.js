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
      // Split SQL into statements more intelligently to handle PostgreSQL dollar-quoted strings
      const statements = splitSqlIntoStatements(sql);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await sequelize.query(statement, { transaction: null, logging: msg => logger.debug(msg) });
        }
      }
      logger.info(`Executed migration: ${file}`);
    }
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
};

// Simple SQL splitter that respects PostgreSQL dollar-quoted strings
// This handles the most common case: $$ ... $$ strings in CREATE FUNCTION
function splitSqlIntoStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarDelimiter = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    // Handle dollar quote delimiters
    if (!inDollarQuote && char === '$' && nextChar) {
      // Check if this is the start of a dollar quote delimiter
      let delimiter = '$';
      let j = i + 1;
      while (j < sql.length && sql[j] !== '$' && sql[j] !== ' ' && sql[j] !== '\n' && sql[j] !== '\t') {
        delimiter += sql[j];
        j++;
      }
      if (j < sql.length && sql[j] === '$') {
        // Found a dollar quote delimiter like $$, $tag$, etc.
        delimiter += '$';
        if (!inDollarQuote) {
          // Starting a dollar-quoted string
          inDollarQuote = true;
          dollarDelimiter = delimiter;
          // Skip over the entire delimiter
          i += delimiter.length - 1;
          continue;
        } else if (delimiter === dollarDelimiter) {
          // Ending the dollar-quoted string
          inDollarQuote = false;
          dollarDelimiter = '';
          // Skip over the entire delimiter
          i += delimiter.length - 1;
          continue;
        }
      }
    }
    
    // Handle semicolons as statement terminators (but not inside dollar quotes)
    if (char === ';' && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  
  // Don't forget the last statement
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s.length > 0);
}
// Function to start server with seed admin
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Run SQL migrations
    await runMigrations();
    logger.info('SQL migrations executed');

    // Synchronize models (no alteration, as migrations already updated schema)
    await sequelize.sync();
    logger.info('Models synchronized');

    // Seed the admin user
    await seedAdmin();
    logger.info('Admin seed verified');

    // Start the server
    server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info('Socket.IO attached to server');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error(error.stack || error);
    // On failure, do not start the server
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

// Start the server
startServer();

module.exports = server;
