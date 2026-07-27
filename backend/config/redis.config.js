const redis = require('redis');
const { logger } = require('../services/loggingService');

/**
 * Redis client configuration with automatic reconnection.
 * Supports REDIS_URL (full connection string) or separate REDIS_HOST/PORT/PASSWORD.
 */
let redisClient = null;

// Build Redis URL if not provided directly
const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : '';
  // If password is empty, we don't want colon before @
  return `redis://${password}${host}:${port}`;
};

const REDIS_URL = getRedisUrl();

if (REDIS_URL) {
  // Create Redis client with reconnection strategy
  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      // Exponential backoff reconnect: start at 50ms, max 30s
      reconnectStrategy: (retries) => {
        const delay = Math.min(Math.pow(2, retries) * 50, 30000);
        logger.info(`Redis reconnect attempt ${retries + 1} in ${delay}ms`);
        return delay;
      },
      // Keep alive
      keepAlive: true,
    },
  });

  // Event listeners for monitoring
  redisClient.on('error', (err) => {
    logger.error('❌ Redis Client Error:', err.message);
  });

  redisClient.on('connecting', () => {
    logger.debug('🔌 Redis Client Connecting...');
  });

  redisClient.on('connect', () => {
    logger.info('🔌 Redis Client Connected');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis Client Ready');
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔄 Redis Client Reconnecting...');
  });

  redisClient.on('end', () => {
    logger.warn('⚠️ Redis Client Disconnected');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis Client Ready');
  });

  // Async connection with error handling
  const connectRedis = async () => {
    if (!redisClient.isOpen) {
      try {
        await redisClient.connect();
        logger.info('🚀 Redis connection established');
      } catch (err) {
        logger.error('Failed to connect to Redis:', err.message);
        // Optionally retry after a short delay (handled by reconnectStrategy)
      }
    }
  };

  // Initiate connection
  connectRedis().catch((err) =>
    logger.error('Initial Redis connection error:', err.message)
  );
} else {
  logger.warn('⚠️ REDIS_URL not defined and REDIS_HOST/PORT not set. Redis disabled.');
}

/**
 * Check if Redis client is ready and connected.
 * @returns {boolean}
 */
const isRedisAvailable = () => {
  return redisClient && redisClient.isOpen && redisClient.isReady;
};

module.exports = {
  client: redisClient,
  isRedisAvailable,
  // Backward compatibility: expose as 'redis' as well
  redis: redisClient,
};
