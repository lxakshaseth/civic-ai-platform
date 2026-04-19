import { createServer } from "node:http";

import { env } from "config/env";
import {
  civicPlatformPool,
  ensureCivicPlatformSchema
} from "database/clients/civic-platform";
import { closeBullMqConnection } from "queues/connection";
import { closeQueues } from "queues/queue.registry";
import { startQueueWorkers, stopQueueWorkers } from "queues/workers";
import { initSocketServer } from "sockets/socket.server";
import { createApp } from "app";
import { logger } from "utils/logger";

const bootstrap = async () => {
  if (civicPlatformPool) {
    await civicPlatformPool.query("SELECT 1");
    await ensureCivicPlatformSchema();
    logger.info("PostgreSQL connected successfully");
  }

  const app = createApp();
  const httpServer = createServer(app);

  initSocketServer(httpServer);

  if (!env.DISABLE_QUEUES) {
    startQueueWorkers();
  }

  httpServer.listen(env.PORT, () => {
    logger.info(`API server listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info("Graceful shutdown started");

    if (!env.DISABLE_QUEUES) {
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
  logger.error({ error, databaseUrl: env.DATABASE_URL }, "Failed to start API server");

  if (civicPlatformPool) {
    await civicPlatformPool.end().catch(() => undefined);
  }

  process.exit(1);
});
