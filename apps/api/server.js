require('dotenv').config()

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')

const { closePool, query } = require('./config/db')
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler')
const complaintRoutes = require('./routes/complaintRoutes')
const userRoutes = require('./routes/userRoutes')

function buildCorsOptions() {
  const allowedOrigins = typeof process.env.CORS_ORIGIN === 'string'
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []

  if (!allowedOrigins.length) {
    return { origin: true, credentials: true }
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  }
}

function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors(buildCorsOptions()))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/health', async (req, res, next) => {
    void req

    try {
      await query('SELECT 1')
      res.status(200).json({
        success: true,
        message: 'Service is healthy.',
      })
    } catch (error) {
      next(error)
    }
  })

  app.use(userRoutes)
  app.use(complaintRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

async function startServer() {
  await query('SELECT 1')

  const port = Number(process.env.PORT || 5000)
  const app = createApp()
  const server = app.listen(port, () => {
    console.log(`Civic backend is running on port ${port}`)
  })

  async function shutdown(signal) {
    console.log(`Received ${signal}. Closing server gracefully...`)

    server.close(async () => {
      try {
        await closePool()
        console.log('PostgreSQL pool closed.')
        process.exit(0)
      } catch (error) {
        console.error('Error while closing PostgreSQL pool:', error)
        process.exit(1)
      }
    })
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  return { app, server }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start backend server:', error)
    process.exit(1)
  })
}

module.exports = {
  createApp,
  startServer,
}
