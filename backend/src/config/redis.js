const { createClient } = require('redis')
const { logger } = require('../services/loggingService')

let client = null
let isConnected = false

const getRedisConfig = () => ({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB, 10) || 0
})

const initRedis = async () => {
  if (client) return client
  const config = getRedisConfig()
  client = createClient({ socket: config.socket, password: config.password, database: config.database })
  client.on('error', (err) => { logger.error('Redis client error:', err.message); isConnected = false })
  client.on('connect', () => { logger.info('Redis client connected'); isConnected = true })
  client.on('reconnecting', () => logger.warn('Redis client reconnecting...'))
  client.on('end', () => { logger.info('Redis client disconnected'); isConnected = false })
  try {
    await client.connect()
    logger.info('Redis connected successfully')
    return client
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message)
    logger.warn('Redis unavailable — services will use fallback/mock behavior')
    return client
  }
}

const createMockClient = () => {
  const store = new Map()
  const geoStore = new Map()
  const mock = {
    get: async (key) => {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expires && Date.now() > entry.expires) { store.delete(key); return null }
      return entry.value
    },
    setex: async (key, ttlSeconds, value) => {
      store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
      return 'OK'
    },
    del: async (key) => { store.delete(key); geoStore.delete(key); return 1 },
    incr: async (key) => {
      const entry = store.get(key)
      const raw = (entry && (!entry.expires || Date.now() <= entry.expires)) ? entry.value : '0'
      const current = parseInt(raw, 10) || 0
      const next = current + 1
      store.set(key, { value: String(next), expires: null })
      return next
    },
    geoAdd: async (key, lng, lat, member) => {
      if (!geoStore.has(key)) geoStore.set(key, [])
      geoStore.get(key).push({ lng, lat, member })
      return 1
    },
    georadius: async (_key, _lng, _lat, _radius, _unit, ..._args) => [],
    duplicate: () => createMockClient(),
    connect: async () => {},
    disconnect: async () => {},
    on: () => {},
    isOpen: false
  }
  return mock
}

const getClient = () => {
  if (client && isConnected) return client
  logger.warn('Redis client not connected — using mock')
  return createMockClient()
}

module.exports = getClient()
module.exports.client = getClient()
module.exports.Redis = getClient()
module.exports.initRedis = initRedis
module.exports.getClient = getClient
