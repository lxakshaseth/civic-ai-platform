import Redis from "ioredis";

import { env } from "config/env";
import { logger } from "utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

export const connectRedis = async () => {
  if (env.DISABLE_QUEUES) {
    logger.warn("Queue system is disabled. Skipping Redis connection.");
    return redis;
  }

  if (redis.status === "ready" || redis.status === "connecting") {
    return redis;
  }

  try {
    await redis.connect();
    logger.info("Redis connected");
    return redis;
  } catch (error) {
    logger.error(
      {
        error,
        redisUrl: env.REDIS_URL
      },
      "Redis connection failed. Start Redis or update REDIS_URL."
    );

    throw error;
  }
};
