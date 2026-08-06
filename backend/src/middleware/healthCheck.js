'use strict'

const { Pool } = require('pg')
const Redis = require('ioredis')
const { logger } = require('../services/loggingService')

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Redis client (reuse existing config)
const { redis } = require('../config/redis')

async function healthCheck (req, res) {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {}
  }

  try {
    // Check PostgreSQL
    await pool.query('SELECT 1')
    checks.services.postgres = { status: 'healthy' }
  } catch (error) {
    logger.error('PostgreSQL health check failed:', error.message)
    checks.services.postgres = { status: 'unhealthy', error: error.message }
  }

  try {
    // Check Redis
    await redis.ping()
    checks.services.redis = { status: 'healthy' }
  } catch (error) {
    logger.error('Redis health check failed:', error.message)
    checks.services.redis = { status: 'unhealthy', error: error.message }
  }

  // Check external services (basic check - in production you might want more thorough checks)
  const externalServices = ['stripe', 'twilio', 'firebase']
  for (const service of externalServices) {
    // For now, we'll assume these are healthy if their API keys are configured
    // In a real implementation, you might make lightweight API calls to verify
    const serviceEnvMap = {
      stripe: process.env.STRIPE_SECRET_KEY,
      twilio: process.env.TWILIO_ACCOUNT_SID,
      firebase: process.env.FIREBASE_SERVICE_ACCOUNT
    }

    if (serviceEnvMap[service]) {
      checks.services[service] = { status: 'healthy' }
    } else {
      checks.services[service] = { status: 'unhealthy', error: 'Missing configuration' }
    }
  }

  // Determine overall status
  const serviceStatuses = Object.values(checks.services).map(service => service.status)
  const status = serviceStatuses.every(s => s === 'healthy') ? 'healthy' : 'unhealthy'

  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    ...checks
  })
}

// Simple metrics endpoint
async function metrics (req, res) {
  try {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Get connection pool stats
    const poolStats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      pendingRequests: pool.waitingCount
    }

    // Get Redis info
    let redisInfo = { status: 'disconnected' }
    try {
      if (redis.isOpen && redis.isReady) {
        redisInfo = { status: 'connected' }
        // You could add more Redis stats here if needed
      }
    } catch (e) {
      // Redis might not be available
    }

    res.json({
      timestamp: new Date().toISOString(),
      cpu: cpuUsage,
      connections: {
        postgres: poolStats,
        redis: redisInfo
      }
    })
  } catch (error) {
    logger.error('Error in metrics endpoint:', error.message)
    res.status(500).json({ error: 'Failed to collect metrics' })
  }
}

module.exports = { healthCheck, metrics }
