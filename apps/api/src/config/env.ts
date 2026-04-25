import { config } from "dotenv";

config();

const PLACEHOLDER_TOKENS = [
  "your_supabase_url",
  "your_upstash_url",
  "your-project-ref",
  "your-password",
  "your-upstash-password",
  "your-upstash-endpoint",
  "replace-with",
  "change_me",
  "example.com"
];

const LOG_LEVELS = new Set(["fatal", "error", "warn", "info", "debug", "trace"]);
const NODE_ENVS = new Set(["development", "test", "production"]);

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_TOKENS.some((token) => normalized.includes(token));
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseString(value: string | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseOptionalString(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalUrl(value: string | undefined) {
  const normalized = parseOptionalString(value);

  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

const rawNodeEnv = parseString(process.env.NODE_ENV, "production");
const nodeEnv = NODE_ENVS.has(rawNodeEnv) ? rawNodeEnv : "production";

const rawDatabaseUrl = parseOptionalString(process.env.DATABASE_URL);
const rawRedisUrl = parseOptionalString(process.env.REDIS_URL);
const rawJwtSecret = parseOptionalString(process.env.JWT_SECRET);
const rawJwtAccessSecret = parseOptionalString(process.env.JWT_ACCESS_SECRET);
const rawJwtRefreshSecret = parseOptionalString(process.env.JWT_REFRESH_SECRET);

const databaseUrlLooksValid =
  rawDatabaseUrl.startsWith("postgresql://") && !isPlaceholder(rawDatabaseUrl);
const redisUrlLooksValid =
  (rawRedisUrl.startsWith("redis://") || rawRedisUrl.startsWith("rediss://")) &&
  !isPlaceholder(rawRedisUrl);

const accessSecret = rawJwtAccessSecret || rawJwtSecret;
const refreshSecret = rawJwtRefreshSecret || rawJwtSecret;
const jwtSecretsConfigured =
  accessSecret.length >= 16 && refreshSecret.length >= 16 && !isPlaceholder(accessSecret);

const envValidationErrors: string[] = [];

if (!parseOptionalString(process.env.NODE_ENV)) {
  envValidationErrors.push("NODE_ENV is missing.");
}

if (!rawDatabaseUrl) {
  envValidationErrors.push("DATABASE_URL is missing.");
} else if (!rawDatabaseUrl.startsWith("postgresql://")) {
  envValidationErrors.push("DATABASE_URL must start with 'postgresql://'.");
} else if (isPlaceholder(rawDatabaseUrl)) {
  envValidationErrors.push("DATABASE_URL contains a placeholder value.");
}

if (!rawRedisUrl) {
  envValidationErrors.push("REDIS_URL is missing.");
} else if (!rawRedisUrl.startsWith("redis://") && !rawRedisUrl.startsWith("rediss://")) {
  envValidationErrors.push("REDIS_URL must start with 'redis://' or 'rediss://'.");
} else if (isPlaceholder(rawRedisUrl)) {
  envValidationErrors.push("REDIS_URL contains a placeholder value.");
}

if (!jwtSecretsConfigured) {
  envValidationErrors.push("JWT_SECRET or both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set with non-placeholder values.");
}

if (!NODE_ENVS.has(rawNodeEnv)) {
  envValidationErrors.push("NODE_ENV must be one of: development, test, production.");
}

console.log("[startup] Environment loaded", {
  nodeEnv,
  hasDatabaseUrl: Boolean(rawDatabaseUrl),
  hasRedisUrl: Boolean(rawRedisUrl),
  databaseUrlValid: databaseUrlLooksValid,
  redisUrlValid: redisUrlLooksValid
});

if (envValidationErrors.length) {
  console.error("[startup] Environment validation failed", envValidationErrors);
}

export const env = {
  NODE_ENV: nodeEnv as "development" | "test" | "production",
  PORT: parseNumber(process.env.PORT, 5000),
  API_PREFIX: parseString(process.env.API_PREFIX, "/api"),
  APP_NAME: parseString(process.env.APP_NAME, "SAIP_API"),
  DATABASE_URL: databaseUrlLooksValid ? rawDatabaseUrl : "",
  DATABASE_URL_IS_VALID: databaseUrlLooksValid,
  EMPLOYEE_DIRECTORY_DATABASE_URL: parseOptionalString(process.env.EMPLOYEE_DIRECTORY_DATABASE_URL),
  CIVIC_PLATFORM_DB_HOST: parseString(process.env.CIVIC_PLATFORM_DB_HOST, ""),
  CIVIC_PLATFORM_DB_PORT: parseNumber(process.env.CIVIC_PLATFORM_DB_PORT, 5432),
  CIVIC_PLATFORM_DB_NAME: parseString(process.env.CIVIC_PLATFORM_DB_NAME, ""),
  CIVIC_PLATFORM_DB_USER: parseString(process.env.CIVIC_PLATFORM_DB_USER, ""),
  CIVIC_PLATFORM_DB_PASSWORD: parseOptionalString(process.env.CIVIC_PLATFORM_DB_PASSWORD),
  REDIS_URL: redisUrlLooksValid ? rawRedisUrl : "",
  REDIS_URL_IS_VALID: redisUrlLooksValid,
  DISABLE_QUEUES: parseBoolean(process.env.DISABLE_QUEUES, false),
  JWT_SECRET: jwtSecretsConfigured ? accessSecret : "development-only-fallback-secret",
  JWT_ACCESS_SECRET: jwtSecretsConfigured ? accessSecret : "development-only-fallback-secret",
  JWT_REFRESH_SECRET: jwtSecretsConfigured ? refreshSecret : "development-only-fallback-secret",
  JWT_SECRETS_VALID: jwtSecretsConfigured,
  JWT_ACCESS_EXPIRES_IN: parseString(process.env.JWT_ACCESS_EXPIRES_IN, "15m"),
  JWT_REFRESH_EXPIRES_IN: parseString(process.env.JWT_REFRESH_EXPIRES_IN, "7d"),
  CORS_ORIGIN: parseString(
    process.env.CORS_ORIGIN,
    "https://your-frontend.onrender.com,http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  PUBLIC_BASE_URL:
    parseOptionalUrl(process.env.PUBLIC_BASE_URL) ||
    `http://127.0.0.1:${parseNumber(process.env.PORT, 5000)}`,
  COOKIE_DOMAIN: parseOptionalString(process.env.COOKIE_DOMAIN),
  COOKIE_SECURE: parseBoolean(process.env.COOKIE_SECURE, nodeEnv === "production"),
  AI_SERVICE_URL: parseOptionalUrl(process.env.AI_SERVICE_URL),
  AI_SERVICE_API_KEY: parseOptionalString(process.env.AI_SERVICE_API_KEY),
  AI_SERVICE_TIMEOUT_MS: parseNumber(process.env.AI_SERVICE_TIMEOUT_MS, 10000),
  GOOGLE_VISION_API_KEY: parseOptionalString(process.env.GOOGLE_VISION_API_KEY),
  GOOGLE_TRANSLATE_API_KEY: parseOptionalString(process.env.GOOGLE_TRANSLATE_API_KEY),
  GOOGLE_TRANSLATE_BASE_URL: parseString(
    process.env.GOOGLE_TRANSLATE_BASE_URL,
    "https://translation.googleapis.com/language/translate/v2"
  ),
  GOOGLE_MAPS_API_KEY: parseOptionalString(process.env.GOOGLE_MAPS_API_KEY),
  GOOGLE_PLACES_BASE_URL: parseString(
    process.env.GOOGLE_PLACES_BASE_URL,
    "https://places.googleapis.com/v1/places:searchNearby"
  ),
  GOOGLE_PLACES_RADIUS_METERS: parseNumber(process.env.GOOGLE_PLACES_RADIUS_METERS, 5000),
  GROQ_API_KEY: parseOptionalString(process.env.GROQ_API_KEY),
  GROQ_MODEL: parseString(process.env.GROQ_MODEL, "llama-3.3-70b-versatile"),
  GROQ_BASE_URL: parseString(process.env.GROQ_BASE_URL, "https://api.groq.com/openai/v1"),
  SMTP_HOST: parseOptionalString(process.env.SMTP_HOST),
  SMTP_PORT: parseNumber(process.env.SMTP_PORT, 587),
  SMTP_USER: parseOptionalString(process.env.SMTP_USER),
  SMTP_PASS: parseOptionalString(process.env.SMTP_PASS),
  EMAIL_FROM: parseString(process.env.EMAIL_FROM, "no-reply@example.com"),
  SMS_PROVIDER: parseString(process.env.SMS_PROVIDER, "mock"),
  SMS_API_KEY: parseOptionalString(process.env.SMS_API_KEY),
  STORAGE_DRIVER: parseString(process.env.STORAGE_DRIVER, "local") as "local" | "s3",
  STORAGE_BUCKET: parseString(process.env.STORAGE_BUCKET, "saip-assets"),
  AWS_ACCESS_KEY_ID: parseOptionalString(process.env.AWS_ACCESS_KEY_ID),
  AWS_SECRET_ACCESS_KEY: parseOptionalString(process.env.AWS_SECRET_ACCESS_KEY),
  AWS_REGION: parseString(process.env.AWS_REGION, "ap-south-1"),
  MAX_FILE_SIZE_MB: parseNumber(process.env.MAX_FILE_SIZE_MB, 10),
  UPLOAD_TEMP_DIR: parseString(process.env.UPLOAD_TEMP_DIR, "uploads/tmp"),
  QUEUE_PREFIX: parseString(process.env.QUEUE_PREFIX, "saip"),
  LOG_LEVEL: (LOG_LEVELS.has(parseString(process.env.LOG_LEVEL, "info"))
    ? parseString(process.env.LOG_LEVEL, "info")
    : "info") as "fatal" | "error" | "warn" | "info" | "debug" | "trace",
  RATE_LIMIT_WINDOW_MS: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  RATE_LIMIT_MAX: parseNumber(process.env.RATE_LIMIT_MAX, 100),
  ENV_VALIDATION_ERRORS: envValidationErrors
};
