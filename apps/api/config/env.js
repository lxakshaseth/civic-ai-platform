const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'REDIS_URL']

function getEnv(name, options = {}) {
  const { defaultValue = '', required = false } = options
  const value = process.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (required) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return defaultValue
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value !== 'string') {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }

  return defaultValue
}

function parseNumber(value, defaultValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function parseOrigins(value) {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function validateServerEnv() {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name]
    return typeof value !== 'string' || !value.trim()
  })

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

module.exports = {
  REQUIRED_ENV_VARS,
  getEnv,
  parseBoolean,
  parseNumber,
  parseOrigins,
  validateServerEnv,
}
