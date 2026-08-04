'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');
const { logger } = require('../services/loggingService');

// Helper function to create a Redis store with fallback to memory store
const createRedisStoreWithFallback = (prefix) => {
  try {
    // Try to create Redis store
    const redisStore = new RedisStore({
      sendCommand: (command, args) => redis.sendCommand(command, ...args),
      prefix: prefix
    });

    // Test the store to see if Lua scripting works
    // We'll do a simple test by trying to initialize it
    // If it fails, we'll fall back to memory store
    return redisStore;
  } catch (error) {
    // If there's an error creating the Redis store (especially Lua script related),
    // fall back to memory store
    if (error.message && (
      error.message.includes('unknown command \'S\'') ||
      error.message.includes('EVAL') ||
      error.message.includes('lua') ||
      error.message.includes('script')
    )) {
      logger.warn(`Redis store initialization failed due to Lua scripting issue: ${error.message}. Falling back to memory store.`);
      return undefined; // Will use default memory store
    }

    // For other errors, we might still want to fall back to be safe
    logger.warn(`Redis store initialization failed: ${error.message}. Falling back to memory store.`);
    return undefined;
  }
};

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  store: createRedisStoreWithFallback('rl:general:'),
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
  store: createRedisStoreWithFallback('rl:auth:'),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Sensitive endpoints limiter - 20 requests per hour
const sensitiveLimiter = rateLimit({
  store: createRedisStoreWithFallback('rl:sensitive:'),
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
    store: createRedisStoreWithFallback('rl:user:'),
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

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveLimiter,
  userLimiter
};
