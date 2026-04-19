require('dotenv').config()

const { Pool } = require('pg')

function createPoolConfig() {
  const host = process.env.DB_HOST || process.env.CIVIC_PLATFORM_DB_HOST
  const user = process.env.DB_USER || process.env.CIVIC_PLATFORM_DB_USER
  const password = process.env.DB_PASSWORD || process.env.CIVIC_PLATFORM_DB_PASSWORD
  const database = process.env.DB_NAME || process.env.CIVIC_PLATFORM_DB_NAME
  const port = Number(process.env.DB_PORT || process.env.CIVIC_PLATFORM_DB_PORT || 5432)
  const connectionString = process.env.DATABASE_URL

  if (host && user && password && database) {
    return {
      host,
      user,
      password,
      database,
      port,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    }
  }

  if (!connectionString) {
    throw new Error(
      'Database configuration is missing. Set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT or DATABASE_URL.'
    )
  }

  return {
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  }
}

const pool = new Pool(createPoolConfig())

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
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
      console.error('Database rollback failed:', rollbackError)
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
