const { Sequelize } = require('sequelize')
const pg = require('pg') // Force Vercel à inclure pg dans le bundle
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), override: false })
const { logger } = require('../services/loggingService')

// Validate required environment variables in non-test environments
const validateEnv = () => {
  if (process.env.NODE_ENV === 'test') return true
  
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
    logger.error('Please check your .env file in the backend directory')
    return false
  }
  
  return true
}

// Check if .env file exists
const checkEnvFile = () => {
  const fs = require('fs')
  const envPath = path.resolve(__dirname, '..', '..', '.env')
  if (!fs.existsSync(envPath)) {
    logger.error(`❌ .env file not found at ${envPath}`)
    logger.error('Please create a .env file in the backend directory with required variables')
  }
}

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// Validate environment before proceeding
if (!isTest && !validateEnv()) {
  // In production, we might want to exit, but let's allow startup to continue
  // and fail later when trying to connect to provide clearer error
  logger.warn('⚠️  Continuing with missing environment variables - connection will likely fail')
}

let sequelize

// Database URL (with fallback construction from individual env vars)
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`

// Connection pool configuration
const poolConfig = {
  max: 20,
  min: 5,
  acquire: 30000,
  idle: isProduction ? 1000 : 10000
}

// SSL required for cloud-hosted PostgreSQL (Supabase, RDS, etc.)
const dialectOptions = isProduction
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {}

if (isTest) {
  // In-memory SQLite for fast isolated tests
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  })
} else {
  // PostgreSQL (development, staging, production)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: isProduction ? false : (msg) => logger.debug(msg),
    pool: poolConfig,
    dialectOptions
  })
}

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    return true
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error.message)
    return false
  }
}

// Sync models
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force })
    return true
  } catch (error) {
    logger.error('❌ Unable to synchronize database models:', error.message)
    return false
  }
}

// Close connection
const closeConnection = async () => {
  try {
    await sequelize.close()
  } catch (error) {
    // Ignore errors on close
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncModels,
  closeConnection
}
