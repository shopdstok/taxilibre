const { Sequelize } = require('sequelize');
const pg = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: false });

const { logger } = require('./src/services/loggingService'); // Adjust path if needed

// If logger is not available, fallback to console
const log = typeof logger !== 'undefined' ? logger : console;

const validateEnv = () => {
  if (process.env.NODE_ENV === 'test') return true;
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    log.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  return true;
};

const checkEnvFile = () => {
  const fs = require('fs');
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    log.error(`❌ .env file not found at ${envPath}`);
  }
};

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (!isTest && !validateEnv()) {
  log.warn('⚠️  Continuing with missing environment variables - connection will likely fail');
}
checkEnvFile();

let sequelize;

if (isTest) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: !isProduction ? (msg) => log.debug(msg) : false
  });
} else {
  const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: !isProduction ? (msg) => log.debug(msg) : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
  });
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    log.info('✅ Connection to the database has been established successfully.');
    return true;
  } catch (error) {
    log.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
