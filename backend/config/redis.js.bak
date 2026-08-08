const redis = require('redis');
const { logger } = require('../services/loggingService');

// Vérifier si Redis est configuré
const REDIS_URL = process.env.REDIS_URL;

let redisClient = null;

if (REDIS_URL) {
  // Créer le client Redis avec l'URL fournie
  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        // Stratégie de reconnexion : attendre 2^retries * 100 ms (max 30s)
        const delay = Math.min(Math.pow(2, retries) * 100, 30000);
        logger.info(`Tentative de reconnexion Redis dans ${delay}ms`);
        return delay;
      }
    }
  });

  // Gestion des événements
  redisClient.on('error', (err) => {
    logger.error('❌ Redis Client Error:', err.message);
  });

  redisClient.on('connect', () => {
    logger.info('🔌 Redis Client Connected');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis Client Ready');
  });

  redisClient.on('reconnecting', () => {
    logger.info('🔄 Redis Client Reconnecting');
  });

  redisClient.on('end', () => {
    logger.warn('Redis Client Disconnected');
  });

  // Connexion asynchrone
  const connectRedis = async () => {
    if (!redisClient.isOpen) {
      try {
        await redisClient.connect();
      } catch (err) {
        logger.error('Failed to connect to Redis:', err.message);
      }
    }
  };

  connectRedis().catch((err) => logger.error('Redis connection error:', err.message));
} else {
  logger.warn('⚠️ REDIS_URL not defined. Redis will be disabled. Some features may not work.');
}

// Fonction utilitaire pour vérifier si Redis est actif
const isRedisAvailable = () => {
  return redisClient !== null && redisClient.isOpen;
};

module.exports = {
  client: redisClient,
  isRedisAvailable,
  // Pour compatibilité avec le code existant, on peut aussi exporter le client sous le nom 'redis'
  redis: redisClient,
};