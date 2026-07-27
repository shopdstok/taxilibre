#!/usr/bin/env node
/**
 * Health check script for Redis connection.
 * Usage: node scripts/health-check.js
 * Exits with code 0 if Redis is reachable, 1 otherwise.
 */
const { client, isRedisAvailable } = require('../backend/config/redis');

const checkRedis = async () => {
  console.log('🔍 Checking Redis connection...');
  // Ensure connection attempt
  if (!client.isOpen) {
    try {
      await client.connect();
    } catch (err) {
      console.error('❌ Failed to connect to Redis:', err.message);
      process.exit(1);
    }
  }

  try {
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis is healthy (PING -> PONG)');
      process.exit(0);
    } else {
      console.error('❌ Unexpected Redis ping response:', pong);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Redis ping failed:', err.message);
    process.exit(1);
  }
};

checkRedis();
