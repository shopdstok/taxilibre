'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');
const { logger } = require('../services/loggingService');

// Test if Redis supports Lua scripting
const testRedisLuaSupport = async () => {
  if (!redis) return false;

  try {
    // Try to execute a simple Lua script that returns a value
    const result = await redis.sendCommand('EVAL', 'return 1', 0);
    return result === 1;
  } catch (error) {
    logger.warn(`Redis Lua scripting test failed: ${error.message}`);
    return false;
  }
};

// Create Redis store with fallback to memory store
const createRateLimiterStore = async (prefix) => {
  const luaSupported = await testRedisLuaSupport();

  if (luaSupported) {
    try {
      const store = new RedisStore({
        sendCommand: (command, args) => redis.sendCommand(command, ...args),
        prefix: prefix
      });
      logger.info(`Using Redis store for rate limiting with prefix: ${prefix}`);
      return store;
    } catch (error) {
      logger.warn(`Failed to create Redis store: ${error.message}. Falling back to memory store.`);
      return undefined;
    }
  } else {
    logger.info(`Redis Lua scripting not supported. Using memory store for rate limiting with prefix: ${prefix}`);
    return undefined;
  }
};

// Initialize stores (we'll initialize them lazily in the rate limiters)
let generalStore = null;
let authStore = null;
let sensitiveStore = null;
let userStore = null;

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  // Store will be set dynamically below
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  skipFailedRequests: false, // Count failed requests towards limit
  skipSuccessfulRequests: false // Count successful requests towards limit
});

// Strict rate limiter for auth endpoints - 5 attempts per 5 minutes
const authLimiter = rateLimit({
  // Store will be set dynamically below
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Sensitive endpoints limiter - 20 requests per hour
const sensitiveLimiter = rateLimit({
  // Store will be set dynamically below
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests to this endpoint from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false
});

// Per-user rate limiter (requires authentication)
const userLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per user per window
    message = 'Too many requests from this user, please try again later.',
    keyGenerator = (req) => {
      // Use user ID if available, otherwise fall back to IP
      return req.user?.id || req.ip || 'anonymous';
    }
  } = options;

  return rateLimit({
    // Store will be set dynamically below
    windowMs: windowMs,
    max: max,
    message: message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  });
};

// Initialize stores asynchronously
const initializeStores = async () => {
  try {
    [generalStore, authStore, sensitiveStore, userStore] = await Promise.all([
      createRateLimiterStore('rl:general:'),
      createRateLimiterStore('rl:auth:'),
      createRateLimiterStore('rl:sensitive:'),
      createRateLimiterStore('rl:user:')
    ]);

    // Assign stores to limiters
    generalLimiter.store = generalStore;
    authLimiter.store = authStore;
    sensitiveLimiter.store = sensitiveStore;
    // Note: userLimiter is a function that returns a rateLimit instance,
    // so we'll handle it differently

    logger.info('Rate limiter stores initialized');
  } catch (error) {
    logger.error('Failed to initialize rate limiter stores:', error);
    // Fallback to memory stores
    generalLimiter.store = undefined;
    authLimiter.store = undefined;
    sensitiveLimiter.store = undefined;
  }
};

// Initialize stores when module is loaded
initializeStores().catch(err => {
  logger.error('Failed to initialize rate limiter stores:', err);
});

// For userLimiter, we need to create a wrapper that initializes the store
const originalUserLimiter = userLimiter;
const userLimiterWithInit = (options = {}) => {
  // Initialize store for this specific limiter instance
  return createRateLimiterStore('rl:user:').then(store => {
    return rateLimit({
      ...options,
      store: store,
      windowMs: options.windowMs ?? 15 * 60 * 1000,
      max: options.max ?? 100,
      message: options.message ?? 'Too many requests from this user, please try again later.',
      keyGenerator: options.keyGenerator ?? ((req) => {
        return req.user?.id || req.ip || 'anonymous';
      }),
      standardHeaders: true,
      legacyHeaders: false,
      skipFailedRequests: false,
      skipSuccessfulRequests: false
    });
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveLimiter,
  userLimiter: userLimiterWithInit
};
