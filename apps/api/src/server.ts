import { createServer } from "node:http";
import express from "express";
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

dotenv.config();

const bootstrap = async () => {
  const PORT = Number(process.env.PORT) || Number(env.PORT) || 4000;

  // 🔥 Try to create your real app; fallback to a basic one if it throws
  let app;
  try {
    app = createApp();
  } catch (err) {
    console.error("❌ createApp() failed, using fallback app:", err);
    app = express();
    app.use(express.json());
    app.get("/", (_req, res) => {
      res.json({ ok: true, message: "Fallback server running 🚀" });
    });
  }

  const httpServer = createServer(app);

  // 🔥 START SERVER IMMEDIATELY (CRITICAL FOR RENDER)
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API server listening on port ${PORT}`);
    logger.info(`🚀 API server listening on port ${PORT}`);
  });

  httpServer.on("error", (error) => {
    console.error("❌ HTTP server failed to start:", error);
    logger.error({ error }, "HTTP server failed to start");
  });

  // 🔥 NON-BLOCKING BACKGROUND INIT
  (async () => {
    logger.info(
      {
        nodeEnv: env.NODE_ENV,
        port: PORT,
        hasDatabaseUrl: Boolean(env.DATABASE_URL),
        hasRedisUrl: Boolean(env.REDIS_URL),
      },
      "Background initialization started"
    );

    let shouldStartQueues = false;

    // Redis
    try {
      shouldStartQueues = !env.DISABLE_QUEUES && Boolean(await connectRedis());
    } catch (error) {
      logger.error({ error }, "Redis connection failed");
    }

    // PostgreSQL
    if (civicPlatformPool) {
      try {
        await civicPlatformPool.query("SELECT 1");
        await ensureCivicPlatformSchema();
        logger.info("PostgreSQL connected");
      } catch (error) {
        logger.error({ error }, "PostgreSQL failed");
      }
    } else {
      logger.warn("No PostgreSQL pool configured");
    }

    // Prisma
    try {
      await prisma.$connect();
      logger.info("Prisma connected");
    } catch (error) {
      logger.error({ error }, "Prisma failed");
    }

    // Queues
    if (shouldStartQueues) {
      try {
        startQueueWorkers();
        logger.info("Queue workers started");
      } catch (error) {
        logger.error({ error }, "Queue start failed");
      }
    }

    // Sockets
    try {
      initSocketServer(httpServer);
    } catch (error) {
      logger.error({ error }, "Socket init failed");
    }
  })();

  // 🛑 Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutdown started");

    await stopQueueWorkers().catch(() => {});
    await closeQueues().catch(() => {});
    await closeBullMqConnection().catch(() => {});
    await prisma.$disconnect().catch(() => {});

    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// 🚀 START
bootstrap().catch(async (error) => {
  console.error("❌ Bootstrap failed:", error);
  logger.error({ error }, "Unexpected bootstrap failure");

  if (civicPlatformPool) {
    await civicPlatformPool.end().catch(() => {});
  }

  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});