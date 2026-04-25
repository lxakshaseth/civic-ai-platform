import { env } from "config/env";

const redisUrl = env.REDIS_URL_IS_VALID ? new URL(env.REDIS_URL) : null;

export const bullMqConnection = redisUrl
  ? {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      db: redisUrl.pathname && redisUrl.pathname !== "/" ? Number(redisUrl.pathname.slice(1)) : 0,
      tls: redisUrl.protocol === "rediss:" ? { rejectUnauthorized: false } : undefined
    }
  : null;

export const closeBullMqConnection = async () => undefined;
