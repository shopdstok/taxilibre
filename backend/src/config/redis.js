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
  return `redis://${password}${host}:${port}`;
};

const REDIS_URL = getRedisUrl();

if (REDIS_URL) {
  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      // Exponential backoff reconnect: start at 50ms, max 30s
      reconnectStrategy: (retries) => {
        const delay = Math.min(Math.pow(2, retries) * 50, 30000);
        logger.info(`Redis reconnect attempt ${retries + 1} in ${delay}ms`);
        return delay;
      },
      keepAlive: true
    }
  });

  redisClient.on('error', (err) => logger.error('Redis Client Error:', err.message));
  redisClient.on('connecting', () => logger.debug('Redis Client Connecting...'));
  redisClient.on('connect', () => logger.info('Redis Client Connected'));
  redisClient.on('ready', () => logger.info('Redis Client Ready'));
  redisClient.on('reconnecting', () => logger.info('Redis Client Reconnecting...'));
  redisClient.on('end', () => logger.warn('Redis Client Disconnected'));

  const connectRedis = async () => {
    if (!redisClient.isOpen) {
      try {
        await redisClient.connect();
        logger.info('Redis connection established');
      } catch (err) {
        logger.error('Failed to connect to Redis:', err.message);
      }
    }
  };

  connectRedis().catch((err) => logger.error('Initial Redis connection error:', err.message));
} else {
  logger.warn('REDIS_URL not defined and REDIS_HOST/PORT not set. Redis disabled.');
}

/**
 * Check if Redis client is ready and connected.
 * @returns {boolean}
 */
const isRedisAvailable = () => !!(redisClient && redisClient.isOpen && redisClient.isReady);

/**
 * Graceful key-value + GEO wrapper around the raw node-redis v4 client.
 *
 * Why this exists:
 *  - node-redis v4 uses camelCase methods (setEx, geoRadius, ...) while legacy
 *    code calls lowercase names (setex, georadius) and positional GEO args.
 *    `kv` normalizes all of that so consumers keep their existing calls.
 *  - It degrades gracefully: when Redis is down/disconnected, kv methods return
 *    sensible defaults (null / [] / 0) instead of throwing, so a Redis outage
 *    never crashes ride creation, auth or pricing.
 *
 * Consumers needing raw client features (pub/sub, streams, duplicate) must use
 * `require('../config/redis').client` directly (e.g. eventBus).
 */
const buildKv = (client) => {
  const ready = () => isRedisAvailable();
  const call = async (fn, fallback) => {
    if (!ready()) return fallback;
    try {
      return await fn();
    } catch (err) {
      logger.warn(`Redis kv op failed: ${err.message}`);
      return fallback;
    }
  };

  return {
    get isOpen () { return ready(); },
    get isReady () { return ready(); },

    get: (key) => call(() => client.get(key), null),
    set: (key, value, opts) => call(() => client.set(key, value, opts), 'OK'),
    setex: (key, seconds, value) => call(() => client.setEx(key, Number(seconds), value), 'OK'),
    setEx: (key, seconds, value) => call(() => client.setEx(key, Number(seconds), value), 'OK'),
    del: (...keys) => call(() => client.del(keys.length === 1 ? keys[0] : keys), 0),
    unlink: (...keys) => call(() => client.unlink(keys.length === 1 ? keys[0] : keys), 0),
    exists: (...keys) => call(() => client.exists(keys.length === 1 ? keys[0] : keys), 0),
    expire: (key, seconds) => call(() => client.expire(key, Number(seconds)), false),
    incr: (key) => call(() => client.incr(key), 0),
    keys: (pattern) => call(() => client.keys(pattern), []),

    // GEO — legacy positional signature: (key, longitude, latitude, member)
    geoAdd: (key, longitude, latitude, member) =>
      call(() => client.geoAdd(key, { longitude, latitude, member }), 0),

    // GEO — legacy positional flags ("WITHDIST","WITHCOORD","COUNT",n,"SORT","ASC")
    // OR an options object ({ WITHDIST, WITHCOORD, COUNT, SORT }).
    geoRadius: (key, longitude, latitude, radius, unit, ...rest) => {
      const opts = {};
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (typeof a === 'string') {
          const up = a.toUpperCase();
          if (up === 'WITHDIST') opts.WITHDIST = true;
          else if (up === 'WITHCOORD') opts.WITHCOORD = true;
          else if (up === 'WITHHASH') opts.WITHHASH = true;
          else if (up === 'ASC') opts.SORT = 'ASC';
          else if (up === 'DESC') opts.SORT = 'DESC';
          else if (up === 'COUNT') { opts.COUNT = rest[i + 1]; i++; }
        } else if (a && typeof a === 'object') {
          Object.assign(opts, a);
        }
      }
      return call(() => client.geoRadius(key, longitude, latitude, radius, unit, opts), []);
    }
  };
};

const kv = buildKv(redisClient);

module.exports = {
  client: redisClient,
  kv,
  isRedisAvailable,
  // Backward compatibility: expose raw client as 'redis' as well
  redis: redisClient
};
