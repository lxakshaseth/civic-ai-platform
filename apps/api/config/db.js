const { Pool } = require('pg')
const { parseBoolean, parseNumber } = require('./env')

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function shouldUseSsl(hostname) {
  if (!hostname) {
    return false
  }

  return !LOCAL_DATABASE_HOSTS.has(hostname.toLowerCase())
}

function resolveSslConfig(connectionString, host) {
  const dbSsl = process.env.DB_SSL
  const sslMode = process.env.PGSSLMODE

  if (typeof dbSsl === 'string') {
    return parseBoolean(dbSsl, true)
      ? { rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false) }
      : false
  }

  if (typeof sslMode === 'string' && sslMode.trim().toLowerCase() === 'disable') {
    return false
  }

  if (connectionString) {
    try {
      const url = new URL(connectionString)
      const sslModeFromUrl = url.searchParams.get('sslmode')

      if (typeof sslModeFromUrl === 'string' && sslModeFromUrl.toLowerCase() === 'disable') {
        return false
      }

      if (shouldUseSsl(url.hostname)) {
        return { rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false) }
      }
    } catch (error) {
      console.warn('Unable to parse DATABASE_URL for SSL detection. Falling back to non-SSL.', error.message)
      return false
    }
  }

  if (shouldUseSsl(host)) {
    return { rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false) }
  }

  return false
}

function createPoolConfig() {
  const connectionString = process.env.DATABASE_URL

  if (connectionString) {
    return {
      connectionString,
      max: parseNumber(process.env.DB_POOL_MAX, 10),
      idleTimeoutMillis: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
      ssl: resolveSslConfig(connectionString),
    }
  }

  const host = process.env.DB_HOST || process.env.CIVIC_PLATFORM_DB_HOST
  const user = process.env.DB_USER || process.env.CIVIC_PLATFORM_DB_USER
  const password = process.env.DB_PASSWORD || process.env.CIVIC_PLATFORM_DB_PASSWORD
  const database = process.env.DB_NAME || process.env.CIVIC_PLATFORM_DB_NAME
  const port = parseNumber(process.env.DB_PORT || process.env.CIVIC_PLATFORM_DB_PORT, 5432)

  if (host && user && password && database) {
    return {
      host,
      user,
      password,
      database,
      port,
      max: parseNumber(process.env.DB_POOL_MAX, 10),
      idleTimeoutMillis: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
      ssl: resolveSslConfig(null, host),
    }
  }

  throw new Error(
    'Database configuration is missing. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.'
  )
}

const pool = new Pool(createPoolConfig())

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message)
})

async function query(text, params = []) {
  try {
    return await pool.query(text, params)
  } catch (error) {
    console.error('Database query failed:', {
      message: error.message,
      query: text,
    })
    throw error
  }
}

async function withTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Database rollback failed:', rollbackError.message)
    }

    throw error
  } finally {
    client.release()
  }
}

async function closePool() {
  await pool.end()
}

module.exports = {
  pool,
  query,
  withTransaction,
  closePool,
}
