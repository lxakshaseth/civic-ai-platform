const Redis = require('ioredis')
const { getEnv, parseBoolean } = require('./env')

const redisUrl = getEnv('REDIS_URL', { required: true })

const redisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 1,
  retryStrategy(attempt) {
    return Math.min(attempt * 200, 2000)
  },
}

if (redisUrl.startsWith('rediss://')) {
  redisOptions.tls = {
    rejectUnauthorized: parseBoolean(process.env.REDIS_TLS_REJECT_UNAUTHORIZED, false),
  }
}

const redis = new Redis(redisUrl, redisOptions)

let connectPromise = null

async function ensureRedisConnection() {
  if (redis.status === 'ready' || redis.status === 'connect') {
    return redis
  }

  if (!connectPromise) {
    connectPromise = redis.connect().finally(() => {
      connectPromise = null
    })
  }

  await connectPromise
  return redis
}

async function closeRedis() {
  if (redis.status === 'end') {
    return
  }

  try {
    await redis.quit()
  } catch (error) {
    redis.disconnect()
  }
}

redis.on('connect', () => {
  console.log('Redis connection established')
})

redis.on('ready', () => {
  console.log('Redis client ready')
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error.message)
})

module.exports = {
  redis,
  ensureRedisConnection,
  closeRedis,
}
