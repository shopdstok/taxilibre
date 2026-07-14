const winston = require('winston')
const path = require('path')

const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : ''
  return `${timestamp} [${level}]: ${message} ${metaString}`.trim()
})

// Transport console : toujours actif
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat)
  })
]

// Transport fichier : UNIQUEMENT en développement local (pas sur Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  try {
    transports.push(new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }))
  } catch (e) {
    // Silencieux : le dossier logs n'existe peut-être pas
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports
})

module.exports = logger

