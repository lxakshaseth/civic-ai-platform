import Redis from "ioredis";

import { env } from "config/env";
import { logger } from "utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

let hasLoggedRedisFailure = false;

const logRedisFailure = (error: unknown) => {
  if (hasLoggedRedisFailure) {
    return;
  }

  hasLoggedRedisFailure = true;
  logger.warn(
    {
      error,
      redisUrl: env.REDIS_URL
    },
    "Redis is unavailable. Continuing without Redis-backed features."
  );
};

export const connectRedis = async () => {
  if (env.DISABLE_QUEUES) {
    logger.warn("Queue system is disabled. Skipping Redis connection.");
    return null;
  }

  if (redis.status === "ready" || redis.status === "connecting") {
    return redis;
  }

  try {
    await redis.connect();
    hasLoggedRedisFailure = false;
    logger.info("Redis connected");
    return redis;
  } catch (error) {
    logRedisFailure(error);
    return null;
  }
};

export const safeRedisGet = async (key: string) => {
  try {
    const client = await connectRedis();

    if (!client) {
      return null;
    }

    return await client.get(key);
  } catch (error) {
    logRedisFailure(error);
    return null;
  }
};

export const safeRedisSet = async (
  key: string,
  value: string,
  ttlSeconds?: number
) => {
  try {
    const client = await connectRedis();

    if (!client) {
      return null;
    }

    if (ttlSeconds && ttlSeconds > 0) {
      return await client.set(key, value, "EX", ttlSeconds);
    }

    return await client.set(key, value);
  } catch (error) {
    logRedisFailure(error);
    return null;
  }
};
