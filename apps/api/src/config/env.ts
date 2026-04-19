import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  APP_NAME: z.string().default("SAIP_API"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:password@localhost:5432/civic_platform"),
  EMPLOYEE_DIRECTORY_DATABASE_URL: z.string().optional().default(""),
  CIVIC_PLATFORM_DB_HOST: z.string().default("localhost"),
  CIVIC_PLATFORM_DB_PORT: z.coerce.number().default(5432),
  CIVIC_PLATFORM_DB_NAME: z.string().default("civic_platform"),
  CIVIC_PLATFORM_DB_USER: z.string().default("postgres"),
  CIVIC_PLATFORM_DB_PASSWORD: z.string().default(""),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  DISABLE_QUEUES: z.coerce.boolean().default(true),
  JWT_ACCESS_SECRET: z.string().min(16).default("saip-local-access-secret-2026"),
  JWT_REFRESH_SECRET: z.string().min(16).default("saip-local-refresh-secret-2026"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"),
  PUBLIC_BASE_URL: z.string().optional().default(""),
  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().min(1).default("local-dev"),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(10000),
  GOOGLE_VISION_API_KEY: z.string().optional().default(""),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional().default(""),
  GOOGLE_TRANSLATE_BASE_URL: z
    .string()
    .url()
    .default("https://translation.googleapis.com/language/translate/v2"),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  GOOGLE_PLACES_BASE_URL: z
    .string()
    .url()
    .default("https://places.googleapis.com/v1/places:searchNearby"),
  GOOGLE_PLACES_RADIUS_METERS: z.coerce.number().default(5000),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("no-reply@saip.local"),
  SMS_PROVIDER: z.string().default("mock"),
  SMS_API_KEY: z.string().optional().default(""),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BUCKET: z.string().default("saip-assets"),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().default("ap-south-1"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  UPLOAD_TEMP_DIR: z.string().default("uploads/tmp"),
  QUEUE_PREFIX: z.string().default("saip"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  CORS_ORIGIN: parsedEnv.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  PUBLIC_BASE_URL:
    parsedEnv.data.PUBLIC_BASE_URL?.trim() || `http://localhost:${parsedEnv.data.PORT}`
};
