'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');
const { logger } = require('../services/loggingService');

// General rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (command, args) => redis.sendCommand(command, ...args),
    prefix: 'rl:general:'
  }),
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
  store: new RedisStore({
    sendCommand: (command, args) => redis.sendCommand(command, ...args),
    prefix: 'rl:auth:'
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Sensitive endpoints limiter - 20 requests per hour
const sensitiveLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (command, args) => redis.sendCommand(command, ...args),
    prefix: 'rl:sensitive:'
  }),
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
    store: new RedisStore({
      sendCommand: (command, args) => redis.sendCommand(command, ...args),
      prefix: 'rl:user:'
    }),
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
