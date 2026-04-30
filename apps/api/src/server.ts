import { createServer } from "node:http";
import cors, { type CorsOptions } from "cors";
import express from "express";
import dotenv from "dotenv";

import { createApp } from "app";
import { env } from "config/env";
import { ensureCivicPlatformSchemaReady } from "database/clients/civic-platform";
import { prisma } from "database/clients/prisma";
import { connectRedis } from "database/clients/redis";
import { closeBullMqConnection } from "queues/connection";
import { closeQueues } from "queues/queue.registry";
import { startQueueWorkers, stopQueueWorkers } from "queues/workers";
import { initSocketServer } from "sockets/socket.server";
import { logger } from "utils/logger";

dotenv.config();

const isAllowedOrigin = (origin: string) => {
  if (origin.endsWith(".vercel.app")) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    const isLocalhost =
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      (protocol === "http:" || protocol === "https:");

    return isLocalhost;
  } catch {
    return false;
  }
};

const corsOptions: CorsOptions = {
  // Reflect only trusted origins so credentials remain safe in production.
  origin(origin, callback) {
    console.log("Incoming origin:", origin);

    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

const buildFallbackApp = () => {
  const app = express();

  // Keep fallback middleware order identical to the main app path.
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ success: true, message: "Fallback server running" });
  });

  app.get("/api", (_req, res) => {
    res.status(200).json({ success: true, message: "API is live" });
  });

  return app;
};

const bootstrap = async () => {
  const PORT = Number(process.env.PORT || env.PORT || 10000);

  let serviceApp;
  try {
    serviceApp = createApp();
  } catch (error) {
    console.error("createApp() failed, using fallback app:", error);
    logger.error({ error }, "createApp failed, using fallback app");
    serviceApp = buildFallbackApp();
  }

  const app = express();

  // Apply CORS before all routes and before any response is sent.
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  // Parse JSON early so direct server-level routes and fallbacks can read request bodies.
  app.use(express.json());

  // Lightweight health endpoint for Render startup checks.
  app.get("/api", (_req, res) => {
    res.status(200).json({ success: true, message: "API is live" });
  });

  app.use(serviceApp);

  const httpServer = createServer(app);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`API server listening on port ${PORT}`);
    logger.info({ port: PORT, host: "0.0.0.0" }, "API server listening");
  });

  httpServer.on("error", (error) => {
    console.error("HTTP server failed:", error);
    logger.error({ error }, "HTTP server failed");
  });

  void (async () => {
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
      logger.info("Prisma connected");
    } catch (error) {
      console.error("Prisma failed:", error);
      logger.error({ error }, "Prisma failed");
    }

    try {
      await ensureCivicPlatformSchemaReady();
      logger.info("Civic platform schema ready");
    } catch (error) {
      logger.error({ error }, "Civic platform schema bootstrap failed");
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
