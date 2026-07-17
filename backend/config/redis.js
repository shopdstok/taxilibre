const redis = require('redis')
const { logger } = require('../services/loggingService')

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

// Handle connection events
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  logger.info('Redis Client Connected')
})

redisClient.on('ready', () => {
  logger.info('Redis Client Ready')
})

redisClient.on('reconnecting', () => {
  logger.info('Redis Client Reconnecting')
})

// Connect to Redis
const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect()
    } catch (err) {
      logger.error('Failed to connect to Redis:', err)
    }
  }
}

// Initialize connection
connectRedis().catch((err) => logger.error('Failed to connect to Redis:', err))

module.exports = {
  redis: redis,
  client: redisClient,
  connectRedis
}