import { createServer } from "node:http";
import dotenv from "dotenv";

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

dotenv.config(); // 🔥 ensure env loaded

const bootstrap = async () => {
  // 🔥 CRITICAL FIX FOR RENDER
  const PORT = process.env.PORT || env.PORT || 4000;

  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      port: PORT,
      hasDatabaseUrl: Boolean(env.DATABASE_URL),
      hasRedisUrl: Boolean(env.REDIS_URL),
      envValidationErrors: env.ENV_VALIDATION_ERRORS
    },
    "Starting API server"
  );

  let shouldStartQueues = false;

  // 🔁 Redis
  try {
    shouldStartQueues = !env.DISABLE_QUEUES && Boolean(await connectRedis());
  } catch (error) {
    logger.error({ error }, "Redis startup check failed. Continuing without queue workers.");
  }

  // 🗄 PostgreSQL
  if (civicPlatformPool) {
    try {
      await civicPlatformPool.query("SELECT 1");
      await ensureCivicPlatformSchema();
      logger.info("PostgreSQL connected successfully");
    } catch (error) {
      logger.error({ error }, "PostgreSQL startup check failed. Continuing without database connectivity.");
    }
  } else {
    logger.error("DATABASE_URL is missing or invalid. DB features disabled.");
  }

  // 🔥 Prisma
  if (env.DATABASE_URL) {
    try {
      await prisma.$connect();
      logger.info("Prisma connected successfully");
    } catch (error) {
      logger.error({ error }, "Prisma startup check failed.");
    }
  }

  // 🚀 Express app
  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  // ⚙️ Queue workers
  if (shouldStartQueues) {
    try {
      startQueueWorkers();
      logger.info("Queue workers started");
    } catch (error) {
      logger.error({ error }, "Failed to start queue workers.");
      shouldStartQueues = false;
    }
  } else if (!env.DISABLE_QUEUES) {
    logger.warn("Redis unavailable. Queues disabled.");
  }

  // ❌ Server error
  httpServer.on("error", (error) => {
    logger.error({ error }, "HTTP server failed to start");
  });

  // ✅ FINAL FIX (Render needs this)
  httpServer.listen(PORT, () => {
    logger.info(`🚀 API server listening on port ${PORT}`);
  });

  // 🛑 Graceful shutdown
  const shutdown = async () => {
    logger.info("Graceful shutdown started");

    if (shouldStartQueues) {
      await stopQueueWorkers().catch(() => undefined);
      await closeQueues().catch(() => undefined);
      await closeBullMqConnection().catch(() => undefined);
    }

    httpServer.close(async () => {
      if (civicPlatformPool) {
        await civicPlatformPool.end().catch(() => undefined);
      }

      await prisma.$disconnect().catch(() => undefined);

      logger.info("Shutdown completed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// 🔥 Bootstrap
bootstrap().catch(async (error) => {
  logger.error({ error }, "Unexpected bootstrap failure");

  if (civicPlatformPool) {
    await civicPlatformPool.end().catch(() => undefined);
  }

  await prisma.$disconnect().catch(() => undefined);

  process.exit(1);
});