import { createServer } from "node:http";

import { env } from "config/env";
import {
  civicPlatformPool,
  ensureCivicPlatformSchema
} from "database/clients/civic-platform";
import { connectRedis } from "database/clients/redis";
import { closeBullMqConnection } from "queues/connection";
import { closeQueues } from "queues/queue.registry";
import { startQueueWorkers, stopQueueWorkers } from "queues/workers";
import { initSocketServer } from "sockets/socket.server";
import { createApp } from "app";
import { logger } from "utils/logger";

const bootstrap = async () => {
  const shouldStartQueues = !env.DISABLE_QUEUES && Boolean(await connectRedis());

  if (civicPlatformPool) {
    await civicPlatformPool.query("SELECT 1");
    await ensureCivicPlatformSchema();
    logger.info("PostgreSQL connected successfully");
  }

  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  if (shouldStartQueues) {
    startQueueWorkers();
  } else if (!env.DISABLE_QUEUES) {
    logger.warn("Redis is unavailable. Queue workers will stay disabled for this process.");
  }

  httpServer.listen(env.PORT, () => {
    logger.info(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info("Graceful shutdown started");

    if (shouldStartQueues) {
      await stopQueueWorkers();
      await closeQueues();
      await closeBullMqConnection();
    }

    httpServer.close(async () => {
      if (civicPlatformPool) {
        await civicPlatformPool.end();
      }

      logger.info("Shutdown completed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch(async (error) => {
  logger.error({ error }, "Failed to start API server");

  if (civicPlatformPool) {
    await civicPlatformPool.end().catch(() => undefined);
  }

  process.exit(1);
});
