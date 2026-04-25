const cors = require('cors')
const express = require('express')
const helmet = require('helmet')

const { closePool, query } = require('./config/db')
const { validateServerEnv, parseOrigins } = require('./config/env')
const { closeRedis, ensureRedisConnection, redis } = require('./config/redis')
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler')
const { logger, requestLogger } = require('./middlewares/requestLogger')
const complaintRoutes = require('./routes/complaintRoutes')
const userRoutes = require('./routes/userRoutes')

function buildCorsOptions() {
  const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN)

  if (!allowedOrigins.length) {
    return { origin: true, credentials: true }
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      const error = new Error('Origin not allowed by CORS')
      error.statusCode = 403
      callback(error)
    },
    credentials: true,
  }
}

function getApiPrefix() {
  const prefix = (process.env.API_PREFIX || '/api').trim()

  if (!prefix.startsWith('/')) {
    return `/${prefix}`
  }

  return prefix === '/' ? '/api' : prefix
}

async function checkDatabaseHealth() {
  await query('SELECT 1')
  return 'connected'
}

async function checkRedisHealth() {
  await ensureRedisConnection()
  await redis.set('health', 'ok', 'EX', 10)
  const redisValue = await redis.get('health')

  if (redisValue !== 'ok') {
    throw new Error('Redis health probe failed.')
  }

  return 'connected'
}

async function getHealthSnapshot() {
  const services = {
    database: 'error',
    redis: 'error',
  }

  const failures = []

  try {
    services.database = await checkDatabaseHealth()
  } catch (error) {
    failures.push(`database: ${error.message}`)
  }

  try {
    services.redis = await checkRedisHealth()
  } catch (error) {
    failures.push(`redis: ${error.message}`)
  }

  return {
    ok: failures.length === 0,
    services,
    failures,
  }
}

function createApp() {
  const app = express()
  const apiPrefix = getApiPrefix()

  app.set('trust proxy', 1)
  app.use(requestLogger)
  app.use(helmet())
  app.use(cors(buildCorsOptions()))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Backend is running.',
    })
  })

  app.get(['/health', `${apiPrefix}/health`], async (req, res, next) => {
    try {
      const health = await getHealthSnapshot()

      res.status(health.ok ? 200 : 503).json({
        success: health.ok,
        message: health.ok ? 'Service is healthy.' : 'Service is unhealthy.',
        services: health.services,
        ...(health.failures.length ? { failures: health.failures } : {}),
      })
    } catch (error) {
      next(error)
    }
  })

  app.use(`${apiPrefix}/users`, userRoutes)
  app.use(`${apiPrefix}/complaints`, complaintRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

async function startServer() {
  try {
    validateServerEnv()

    const port = Number(process.env.PORT || 5000)
    const app = createApp()

    const server = app.listen(port, () => {
      logger.info({ port, apiPrefix: getApiPrefix() }, 'API server started')
    })

    server.on('error', (error) => {
      logger.error({ error }, 'HTTP server failed to start')
      process.exit(1)
    })

    void checkDatabaseHealth()
      .then(() => logger.info('PostgreSQL connection verified'))
      .catch((error) => logger.warn({ error: error.message }, 'PostgreSQL health check failed during startup'))

    void checkRedisHealth()
      .then(() => logger.info('Redis connection verified'))
      .catch((error) => logger.warn({ error: error.message }, 'Redis health check failed during startup'))

    async function shutdown(signal) {
      logger.info({ signal }, 'Received shutdown signal')

      server.close(async () => {
        try {
          await closePool()
          await closeRedis()
          logger.info('PostgreSQL and Redis connections closed')
          process.exit(0)
        } catch (error) {
          logger.error({ error }, 'Error during shutdown')
          process.exit(1)
        }
      })
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    return { app, server }
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

module.exports = {
  createApp,
  startServer,
}
