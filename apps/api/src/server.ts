import { createServer } from "node:http";
import cors, { type CorsOptions } from "cors";
import express from "express";
import dotenv from "dotenv";

import { createApp } from "app";
import { env } from "config/env";
import { prisma } from "database/clients/prisma";
import { connectRedis } from "database/clients/redis";
import { closeBullMqConnection } from "queues/connection";
import { closeQueues } from "queues/queue.registry";
import { startQueueWorkers, stopQueueWorkers } from "queues/workers";
import { initSocketServer } from "sockets/socket.server";
import { logger } from "utils/logger";

dotenv.config();

const allowedOrigins = [
  "http://localhost:3000",
  "https://civic-ai-platform-frontend-git-main-akshats-projects.vercel.app"
];

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

const removeCorsMiddleware = (app: express.Express) => {
  const stack = (app as express.Express & {
    _router?: { stack?: Array<{ handle?: { name?: string } }> };
  })._router?.stack;

  if (!stack) {
    return;
  }

  (app as express.Express & {
    _router?: { stack?: Array<{ handle?: { name?: string } }> };
  })._router!.stack = stack.filter((layer) => layer.handle?.name !== "corsMiddleware");
};

const bootstrap = async () => {
  const PORT = Number(process.env.PORT) || Number(env.PORT) || 4000;

  console.log("ENV DATABASE_URL:", process.env.DATABASE_URL);

  let serviceApp;
  try {
    serviceApp = createApp();
    removeCorsMiddleware(serviceApp);
  } catch (error) {
    console.error("createApp() failed, using fallback app:", error);
    serviceApp = express();
    serviceApp.use(express.json());
    serviceApp.get("/", (_req, res) => {
      res.json({ success: true, message: "Fallback server running" });
    });
  }

  const app = express();
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(serviceApp);

  const httpServer = createServer(app);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`API server listening on port ${PORT}`);
    logger.info(`API server listening on port ${PORT}`);
  });

  httpServer.on("error", (error) => {
    console.error("HTTP server failed:", error);
    logger.error({ error }, "HTTP server failed");
  });

  (async () => {
    logger.info(
      {
        nodeEnv: env.NODE_ENV,
        port: PORT,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasRedisUrl: Boolean(env.REDIS_URL)
      },
      "Background initialization started"
    );

    let shouldStartQueues = false;

    try {
      shouldStartQueues = !env.DISABLE_QUEUES && Boolean(await connectRedis());
    } catch (error) {
      logger.error({ error }, "Redis failed");
    }

    try {
      await prisma.$connect();

      const url = (prisma as any)?._engineConfig?.datasources?.[0]?.url ?? "not resolved";

      console.log("Prisma DB URL:", url);
      console.log("DB TEST:", await prisma.user.findMany());

      logger.info("Prisma connected");
    } catch (error) {
      console.error("Prisma failed:", error);
      logger.error({ error }, "Prisma failed");
    }

    if (shouldStartQueues) {
      try {
        startQueueWorkers();
        logger.info("Queue workers started");
      } catch (error) {
        logger.error({ error }, "Queue start failed");
      }
    }

    try {
      initSocketServer(httpServer);
    } catch (error) {
      logger.error({ error }, "Socket init failed");
    }
  })();

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

bootstrap().catch(async (error) => {
  console.error("Bootstrap failed:", error);
  logger.error({ error }, "Bootstrap failure");

  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
