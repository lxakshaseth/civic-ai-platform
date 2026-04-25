const Redis = require('ioredis')
const { getEnv, parseBoolean } = require('./env')

// 🔥 FORCE REDIS_URL
const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('❌ REDIS_URL is missing in environment variables')
}

console.log('🔍 REDIS URL:', redisUrl ? 'FOUND ✅' : 'MISSING ❌')

// 🔥 OPTIONS
const redisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 1,
  retryStrategy(attempt) {
    return Math.min(attempt * 200, 2000)
  },
}

// 🔥 REQUIRED for Upstash (TLS)
if (redisUrl.startsWith('rediss://')) {
  redisOptions.tls = {
    rejectUnauthorized: false, // 🔥 important
  }
}

// 🔥 CREATE CLIENT
const redis = new Redis(redisUrl, redisOptions)

// 🔥 CONNECTION HANDLER
let connectPromise = null

async function ensureRedisConnection() {
  if (redis.status === 'ready') return redis

  if (!connectPromise) {
    connectPromise = redis.connect().finally(() => {
      connectPromise = null
    })
  }

  await connectPromise
  return redis
}

// 🔥 CLOSE
async function closeRedis() {
  try {
    await redis.quit()
  } catch (error) {
    redis.disconnect()
  }
}

/* ---------------- EVENTS ---------------- */

redis.on('connect', () => {
  console.log('✅ Redis connected')
})

redis.on('ready', () => {
  console.log('🎯 Redis ready')
})

redis.on('error', (error) => {
  console.error('❌ Redis error:', error.message)
})

module.exports = {
  redis,
  ensureRedisConnection,
  closeRedis,
}