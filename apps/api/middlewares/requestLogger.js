const pino = require('pino')
const pinoHttp = require('pino-http')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
})

const requestLogger = pinoHttp({
  logger,
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) {
      return 'error'
    }

    if (res.statusCode >= 400) {
      return 'warn'
    }

    return 'info'
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.originalUrl} completed with ${res.statusCode}`
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.originalUrl} failed with ${res.statusCode}: ${error.message}`
  },
})

module.exports = {
  logger,
  requestLogger,
}
