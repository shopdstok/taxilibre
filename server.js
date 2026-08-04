const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const { swaggerUi, swaggerSpec } = require('./swagger')
const errorHandler = require('./src/middleware/errorMiddleware')
const connectDB = require('./src/config/database')
const { logger } = require('./src/services/loggingService')
const { run } = require('./src/utils/asyncStorage')

require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

// Connexion à la base de données
connectDB()

// Middleware pour définir le stockage de contexte asynchrone pour RLS
app.use((req, res, next) => {
  const store = {
    userId: req.user?.id ?? '',
    userRole: req.user?.role ?? '',
  }
  return run(store, () => {
    next()
  })
})

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé pour permettre Swagger UI
}))

// CORS configuration
const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  'https://taxilibre.com',
  'https://admin.taxilibre.com',
  'https://driver.taxilibre.com',
  'https://taxilibre.vercel.app',
  'https://passenger-web-sigma.vercel.app',
  'https://driver-web-alpha.vercel.app',
  'https://admin-dashboard-sandy-theta.vercel.app'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Stricter rate limiting for auth endpoints (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/v1/auth', authLimiter)
app.use('/api/v1/oauth', authLimiter)
app.use('/api/v1/mfa', authLimiter)

app.use('/api/', limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`)
    }
  })

  next()
})

// Trust proxy for IP detection
app.set('trust proxy', 1)

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.removeHeader('X-Powered-By')
  next()
})

// API versioning
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1'
  next()
})

// Import and register routes
const authRoutes = require('./src/routes/auth.routes')
const userRoutes = require('./src/routes/userRoutes')
const driverRoutes = require('./src/routes/driverRoutes')
const rideRoutes = require('./src/routes/rides.routes')
const paymentRoutes = require('./src/routes/paymentRoutes')
const notificationRoutes = require('./src/routes/notificationRoutes')
const reviewRoutes = require('./src/routes/reviewRoutes')
const locationRoutes = require('./src/routes/locationRoutes')
const pushRoutes = require('./src/routes/pushRoutes')
const oauthRoutes = require('./src/routes/oauthRoutes')
const adminRoutes = require('./src/routes/adminRoutes')
const mfaRoutes = require('./src/routes/mfaRoutes')
const analyticsRoutes = require('./src/routes/analyticsRoutes')
const geofencingRoutes = require('./src/routes/geofencingRoutes')

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/oauth', oauthRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/drivers', driverRoutes)
app.use('/api/v1/rides', rideRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/locations', locationRoutes)
app.use('/api/v1/push', pushRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/mfa', mfaRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/geofencing', geofencingRoutes)

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TaxiLibre API Documentation'
}))

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})
// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'TaxiLibre Backend',
    status: 'running',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    api: '/api/v1',
    timestamp: new Date().toISOString()
  })
})
// Health check endpoints
app.get('/health', (req, res) => {
  const dbReady = app.get('dbReady') === true
  res.status(200).json({ status: 'OK', db: dbReady ? 'connected' : 'connecting', timestamp: new Date().toISOString() })
})

// Readiness probe: renvoie 503 tant que la base de données n'est pas connectée.
app.get('/ready', (req, res) => {
  const dbReady = app.get('dbReady') === true
  if (dbReady) {
    return res.status(200).json({ status: 'ready', db: 'connected', timestamp: new Date().toISOString() })
  }
  res.status(503).json({ status: 'not_ready', db: 'connecting', timestamp: new Date().toISOString() })
})

app.get('/api/health', (req, res) => {
  const dbReady = app.get('dbReady') === true
  res.status(200).json({ status: 'OK', db: dbReady ? 'connected' : 'connecting', timestamp: new Date().toISOString() })
})

// Metrics endpoint
const client = require('prom-client')
const register = new client.Registry()

register.setDefaultLabels({
  app: 'taxilibre-backend'
})

client.collectDefaultMetrics({ register })

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status_code']
})

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, status_code: res.statusCode })
  })
  next()
})

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics()
    res.set('Content-Type', register.contentType)
    res.end(metrics)
  } catch (ex) {
    res.status(500).end(ex)
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  })
})

// Error handling middleware
app.use(errorHandler)

module.exports = app