const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const { generalLimiter, authLimiter, sensitiveLimiter, userLimiter } = require('./middleware/rateLimiter')
const { errorHandler } = require('./middleware/errorMiddleware')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const { logger } = require("./services/loggingService")
const { run } = require('./utils/asyncStorage')

//
// Para ignorar Redis (no utilizado)
//
process.on('uncaughtException', (err) => {
    if (err.code === 'ECONNREFUSED' && err.address === '127.0.0.1' && err.port === 6379) {
        logger.warn('Redis ignorado (no utilizado)')
        return
    }
    logger.error('Error no manejado:', err)
})

process.on('unhandledRejection', (reason) => {
    if (reason.code === 'ECONNREFUSED' && reason.address === '127.0.0.1' && reason.port === 6379) {
        logger.warn('Redis ignorado (no utilizado)')
        return
    }
    logger.error('Rechazo no manejado:', reason)
})

const app = express()

// Middleware para definir el almacenamiento de contexto asincrónico para RLS
app.use((req, res, next) => {
  const store = {
    userId: req.user?.id ?? '',
    userRole: req.user?.role ?? '',
  }
  return run(store, () => {
    next()
  })
})

// Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"]
  }
}))

// Configuración de CORS
app.use(cors({
  origin: function (origin, callback) {
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

    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Limitación de tasa basada en Redis (para scaling horizontal)
// Aplicar limitador general a todas las rutas
app.use(generalLimiter)

// Limitación de tasa más estricta para endpoints de autenticación (anti fuerza bruta)
app.use('/api/v1/auth', authLimiter)
app.use('/api/v1/oauth', authLimiter)
app.use('/api/v1/mfa', authLimiter)

// Aplicar limitador para endpoints sensibles
app.use('/api/v1/payments', sensitiveLimiter)
app.use('/api/v1/admin', sensitiveLimiter)
app.use('/api/v1/drivers', sensitiveLimiter) // Assuming drivers endpoints are sensitive

// Middleware para el análisis de cuerpos
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Registro de solicitudes
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

// Confianza en el proxy para la detección de IP
app.set('trust proxy', 1)

// Cabeceras de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.removeHeader('X-Powered-By')
  next()
})

// Versionado de API
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1'
  next()
})

// Importar y registrar rutas
const authRoutes = require('./routes/auth.routes')
const userRoutes = require('./routes/userRoutes')
const driverRoutes = require('./routes/driverRoutes')
const rideRoutes = require('./routes/rides.routes')
const paymentRoutes = require('./routes/paymentRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const adminRoutes = require('./routes/adminRoutes')
const locationRoutes = require('./routes/locationRoutes')
const oauthRoutes = require('./routes/oauthRoutes')
const monitoringRoutes = require('./routes/monitoring');
const socketService = require('./services/socketService')

// Rutas API
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/drivers', driverRoutes)
app.use('/api/v1/rides', rideRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/location', locationRoutes)
app.use('/api/v1/oauth', oauthRoutes)
app.use('/api', monitoringRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API de TaxiLibre',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => {
  const dbReady = app.get('dbReady') === true
  res.status(200).json({ status: 'OK', db: dbReady ? 'connected' : 'connecting', timestamp: new Date().toISOString() })
})

// Endpoint de métricas
const client = require('prom-client')
const register = new client.Registry()

register.setDefaultLabels({
  app: 'taxilibre-backend'
})

client.collectDefaultMetrics({ register })

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de solicitudes HTTP',
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

// Manejador de 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  })
})

// Middleware de manejo de errores
app.use(errorHandler)

module.exports = app
