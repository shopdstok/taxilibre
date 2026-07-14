const winston = require('winston')
const path = require('path')
const logFormat = winston.format.printf(({ level, message, label, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
  return `${timestamp} [${label}] ${level}: ${message} ${metaString}`.trim()
})
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.label({ label: 'taxilibre' }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'taxilibre-backend' },
  transports: []
})
logger.add(new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat)
}))
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  try {
    logger.add(new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }))
    logger.add(new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    }))
  } catch (error) {
    logger.warn('Could not create log file transports')
  }
}
class QueryLogger { static logQuery(i) { logger.debug('Query', { model: i.constructor.name }) } }
class PerformanceMonitor { static async measure(n, f) { const s = process.hrtime.bigint(); try { const r = await f(); const d = Number(process.hrtime.bigint() - s) / 1000000; logger.info(`Perf: ${n}`, { durationMs: d }); return r } catch (e) { throw e } } }
const requestLogger = (req, res, next) => { const s = process.hrtime.bigint(); logger.info('Incoming', { method: req.method, url: req.originalUrl }); res.on('finish', () => { logger.info('Outgoing', { method: req.method, url: req.originalUrl, statusCode: res.statusCode }) }); next() }
const errorLogger = (err, req, res, next) => { logger.error('App error', { error: err.message }); next(err) }
class BusinessEventLogger {
  static userRegistered(u) { logger.info('user_registered', { userId: u.id }) }
  static rideRequested(r, u) { logger.info('ride_requested', { rideId: r.id }) }
  static rideCompleted(r) { logger.info('ride_completed', { rideId: r.id }) }
  static paymentProcessed(p, r) { logger.info('payment_processed', { paymentId: p.id }) }
  static driverStatusChanged(d, o, n) { logger.info('driver_status_changed', { driverId: d.id }) }
}
module.exports = { logger, QueryLogger, PerformanceMonitor, requestLogger, errorLogger, BusinessEventLogger }
