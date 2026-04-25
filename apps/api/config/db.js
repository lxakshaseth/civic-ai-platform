require('dotenv').config()

const { Pool } = require('pg')

/* ---------------- VALIDATION ---------------- */
function validateDatabaseUrl(url) {
  if (!url) {
    throw new Error('❌ DATABASE_URL is missing')
  }

  if (!url.startsWith('postgresql://')) {
    throw new Error('❌ DATABASE_URL must start with "postgresql://"')
  }

  try {
    const parsed = new URL(url)

    console.log('🔍 DB HOST:', parsed.hostname)

    if (!parsed.hostname.includes('supabase.co')) {
      console.warn('⚠️ Warning: Not a Supabase database')
    }

    return parsed
  } catch (err) {
    throw new Error('❌ Invalid DATABASE_URL format')
  }
}

/* ---------------- CONFIG ---------------- */
function createPoolConfig() {
  const connectionString = process.env.DATABASE_URL

  const parsed = validateDatabaseUrl(connectionString)

  return {
    connectionString,

    // 🔥 REQUIRED for Supabase (fixes ECONNREFUSED / SSL issues)
    ssl: {
      rejectUnauthorized: false,
    },

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }
}

/* ---------------- POOL ---------------- */
const pool = new Pool(createPoolConfig())

/* ---------------- EVENTS ---------------- */
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected')
})

pool.on('error', (error) => {
  console.error('❌ PostgreSQL pool error:', error.message)
})

/* ---------------- QUERY ---------------- */
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

/* ---------------- TRANSACTION ---------------- */
async function withTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Transaction failed:', error.message)
    throw error
  } finally {
    client.release()
  }
}

/* ---------------- HEALTH CHECK ---------------- */
async function checkDbConnection() {
  try {
    await pool.query('SELECT 1')
    console.log('🎯 DB connection verified')
    return true
  } catch (error) {
    console.error('❌ DB connection failed:', error.message)
    return false
  }
}

/* ---------------- CLOSE ---------------- */
async function closePool() {
  console.log('🛑 Closing DB pool...')
  await pool.end()
}

/* ---------------- EXPORTS ---------------- */
module.exports = {
  pool,
  query,
  withTransaction,
  closePool,
  checkDbConnection,
}