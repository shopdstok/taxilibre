const { sequelize } = require('./config/database')
const app = require('./app')
const { logger } = require('./services/loggingService')

// Para ignorar Redis (no utilizado)
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

const startServer = async () => {
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate()
    logger.info('✅ Conexión a la base de datos establecida')
    app.set('dbReady', true)

    // Opcional: sincronizar modelos (descomentar si es necesario)
    // await sequelize.sync({ alter: true })

    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado en el puerto ${PORT}`)
    })
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error)
    process.exit(1)
  }
}

startServer()

module.exports = app
