import { createServer } from "node:http";

import { env } from "config/env";
import {
  civicPlatformPool,
  ensureCivicPlatformSchema
} from "database/clients/civic-platform";
import { prisma } from "database/clients/prisma";
import { connectRedis } from "database/clients/redis";
import { closeBullMqConnection } from "queues/connection";
import { closeQueues } from "queues/queue.registry";
import { startQueueWorkers, stopQueueWorkers } from "queues/workers";
import { initSocketServer } from "sockets/socket.server";
import { createApp } from "app";
import { logger } from "utils/logger";

const bootstrap = async () => {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      hasDatabaseUrl: Boolean(env.DATABASE_URL),
      hasRedisUrl: Boolean(env.REDIS_URL),
      envValidationErrors: env.ENV_VALIDATION_ERRORS
    },
    "Starting API server"
  );

  let shouldStartQueues = false;

  try {
    shouldStartQueues = !env.DISABLE_QUEUES && Boolean(await connectRedis());
  } catch (error) {
    logger.error({ error }, "Redis startup check failed. Continuing without queue workers.");
  }

  if (civicPlatformPool) {
    try {
      await civicPlatformPool.query("SELECT 1");
      await ensureCivicPlatformSchema();
      logger.info("PostgreSQL connected successfully");
    } catch (error) {
      logger.error({ error }, "PostgreSQL startup check failed. Continuing without database connectivity.");
    }
  } else {
    logger.error("DATABASE_URL is missing, invalid, or contains a placeholder. Database features are disabled.");
  }

  if (env.DATABASE_URL_IS_VALID) {
    try {
      await prisma.$connect();
      logger.info("Prisma connected successfully");
    } catch (error) {
      logger.error({ error }, "Prisma startup check failed. Prisma-backed endpoints may be unavailable.");
    }
  }

  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  if (shouldStartQueues) {
    try {
      startQueueWorkers();
      logger.info("Queue workers started");
    } catch (error) {
      logger.error({ error }, "Failed to start queue workers. Continuing without queues.");
      shouldStartQueues = false;
    }
  } else if (!env.DISABLE_QUEUES) {
    logger.warn("Redis is unavailable. Queue workers will stay disabled for this process.");
  }

  httpServer.on("error", (error) => {
    logger.error({ error }, "HTTP server failed to start");
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info("Graceful shutdown started");

    if (shouldStartQueues) {
      await stopQueueWorkers().catch((error) => {
        logger.error({ error }, "Failed to stop queue workers cleanly");
      });
      await closeQueues().catch((error) => {
        logger.error({ error }, "Failed to close queues cleanly");
      });
      await closeBullMqConnection().catch((error) => {
        logger.error({ error }, "Failed to close BullMQ connection cleanly");
      });
    }

    httpServer.close(async () => {
      if (civicPlatformPool) {
        await civicPlatformPool.end().catch((error) => {
          logger.error({ error }, "Failed to close PostgreSQL pool cleanly");
        });
      }

      await prisma.$disconnect().catch((error) => {
        logger.error({ error }, "Failed to disconnect Prisma cleanly");
      });

      logger.info("Shutdown completed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch(async (error) => {
  logger.error({ error }, "Unexpected bootstrap failure. Server process will stay alive only if HTTP startup succeeded.");

  if (civicPlatformPool) {
    await civicPlatformPool.end().catch(() => undefined);
  }

  await prisma.$disconnect().catch(() => undefined);

  process.exit(1);
});
