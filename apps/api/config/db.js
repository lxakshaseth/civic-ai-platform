require('dotenv').config()

const { Pool } = require('pg')

// 🔥 VALIDATE DATABASE_URL FIRST
function validateDatabaseUrl(url) {
  if (!url) {
    throw new Error('❌ DATABASE_URL is missing in environment variables')
  }

  if (!url.startsWith('postgresql://')) {
    throw new Error('❌ DATABASE_URL must start with "postgresql://"')
  }

  try {
    const parsed = new URL(url)

    if (!parsed.hostname.includes('supabase.co')) {
      console.warn('⚠️ Warning: DATABASE_URL does not look like Supabase')
    }

    return true
  } catch (err) {
    throw new Error('❌ Invalid DATABASE_URL format')
  }
}

// 🔥 CREATE CONFIG (NO FALLBACK TO LOCALHOST)
function createPoolConfig() {
  const connectionString = process.env.DATABASE_URL

  validateDatabaseUrl(connectionString)

  return {
    connectionString,

    // 🔥 REQUIRED FOR SUPABASE
    ssl: {
      rejectUnauthorized: false,
    },

    // optional tuning
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }
}

const pool = new Pool(createPoolConfig())

// 🔥 LOG ERRORS
pool.on('error', (error) => {
  console.error('❌ PostgreSQL pool error:', error.message)
})

// 🔥 SIMPLE QUERY FUNCTION
async function query(text, params = []) {
  try {
    return await pool.query(text, params)
  } catch (error) {
    console.error('❌ Query failed:', {
      message: error.message,
      query: text,
    })
    throw error
  }
}

// 🔥 TRANSACTION SUPPORT
async function withTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// 🔥 CLEAN SHUTDOWN
async function closePool() {
  await pool.end()
}

module.exports = {
  pool,
  query,
  withTransaction,
  closePool,
}