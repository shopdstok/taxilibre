const os = require('os')

const healthCheck = async (req, res, next) => {
  try {
    const memory = process.memoryUsage()
    const uptime = process.uptime()
    const load = os.loadavg()
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime * 100) / 100,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memory.external / 1024 / 1024) + ' MB'
      },
      cpu: {
        '1min': load[0],
        '5min': load[1],
        '15min': load[2]
      },
      os: {
        platform: process.platform,
        release: os.release(),
        totalmem: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        freemem: Math.round(os.freemem() / 1024 / 1024) + ' MB'
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { healthCheck }
