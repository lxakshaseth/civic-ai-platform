require('dotenv').config()

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

/* ---------------- DEBUG ENV ---------------- */
console.log("🌍 ENV DEBUG START")
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "FOUND ✅" : "MISSING ❌")
console.log("REDIS_URL:", process.env.REDIS_URL ? "FOUND ✅" : "MISSING ❌")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("🌍 ENV DEBUG END")

/* ---------------- CORS ---------------- */
function buildCorsOptions() {
  const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN)

  if (!allowedOrigins.length) {
    return { origin: true, credentials: true }
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  }
}

/* ---------------- API PREFIX ---------------- */
function getApiPrefix() {
  const prefix = (process.env.API_PREFIX || '/api').trim()
  return prefix.startsWith('/') ? prefix : `/${prefix}`
}

/* ---------------- HEALTH ---------------- */
async function checkDatabaseHealth() {
  console.log("🔍 Checking DB connection...")
  await query('SELECT 1')
  console.log("✅ DB QUERY SUCCESS")
  return 'connected'
}

async function checkRedisHealth() {
  console.log("🔍 Checking Redis...")
  await ensureRedisConnection()

  await redis.set('health', 'ok', 'EX', 10)
  const value = await redis.get('health')

  if (value !== 'ok') throw new Error('Redis failed')

  console.log("✅ Redis OK")
  return 'connected'
}

async function getHealthSnapshot() {
  const services = { database: 'error', redis: 'error' }
  const failures = []

  try {
    services.database = await checkDatabaseHealth()
  } catch (e) {
    failures.push(`database: ${e.message}`)
  }

  try {
    services.redis = await checkRedisHealth()
  } catch (e) {
    failures.push(`redis: ${e.message}`)
  }

  return {
    ok: failures.length === 0,
    services,
    failures,
  }
}

/* ---------------- APP ---------------- */
function createApp() {
  const app = express()
  const apiPrefix = getApiPrefix()

  app.set('trust proxy', 1)

  app.use(requestLogger)
  app.use(helmet())
  app.use(cors(buildCorsOptions()))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  // ✅ Root route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '🚀 Civic AI Backend Running',
    })
  })

  // ✅ Health route
  app.get(['/health', `${apiPrefix}/health`], async (req, res) => {
    const health = await getHealthSnapshot()

    res.status(health.ok ? 200 : 503).json({
      success: health.ok,
      services: health.services,
      ...(health.failures.length && { failures: health.failures }),
    })
  })

  // ✅ Routes
  app.use(`${apiPrefix}/users`, userRoutes)
  app.use(`${apiPrefix}/complaints`, complaintRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

/* ---------------- START SERVER ---------------- */
async function startServer() {
  try {
    console.log("🚀 Starting server...")

    validateServerEnv()

    const port = Number(process.env.PORT || 5000)
    const app = createApp()

    const server = app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`)
    })

    // 🔥 DB CHECK (IMPORTANT DEBUG)
    checkDatabaseHealth()
      .then(() => console.log('🎯 DB CONNECTED SUCCESSFULLY'))
      .catch((e) => {
        console.error("❌ DB CONNECTION FAILED")
        console.error("REASON:", e.message)
      })

    // 🔥 Redis check
    checkRedisHealth()
      .then(() => console.log('🎯 REDIS CONNECTED'))
      .catch((e) => console.warn('⚠️ Redis error:', e.message))

    // 🔥 Shutdown
    async function shutdown(signal) {
      console.log(`🛑 Shutting down: ${signal}`)

      server.close(async () => {
        try {
          await closePool()
          await closeRedis()
          console.log('✅ Resources closed')
          process.exit(0)
        } catch (err) {
          console.error('❌ Shutdown error:', err)
          process.exit(1)
        }
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

  } catch (error) {
    console.error('🔥 SERVER START FAILED:', error)
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