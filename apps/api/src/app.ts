import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { appConfig } from "config/app.config";
import { env } from "config/env";
import { uploadConfig } from "config/upload.config";
import { errorMiddleware } from "middlewares/error-handler";
import { notFoundMiddleware } from "middlewares/not-found-handler";
import { requestLoggerMiddleware } from "middlewares/request-logger";
import { apiRouter } from "routes/index";

export const createApp = () => {
  const app = express();
  const allowedOrigins = new Set([
    "http://localhost:3000",
    "https://civic-ai-platform-frontend-git-main-akshats-projects-eb688e4b.vercel.app"
  ]);
  const corsOptions: cors.CorsOptions = {
    // CORS must run before all routes and before any response is sent.
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  };

  // 🌐 CORS
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  // 🔒 Security
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      },
      frameguard: false
    })
  );

  // 🧠 Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 📜 Logger
  app.use(requestLoggerMiddleware);

  // 🚦 Rate limiter
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.NODE_ENV === "production" ? env.RATE_LIMIT_MAX : env.RATE_LIMIT_MAX * 10,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => env.NODE_ENV !== "production" && req.path.endsWith("/auth/me")
    })
  );

  // 📁 Uploads static
  app.use("/uploads", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src * 'self' data: blob:; img-src * data: blob:; frame-src *;"
    );
    next();
  });

  app.use("/uploads", express.static(uploadConfig.uploadsRoot));

  // =========================================
  // ✅ ADD THIS (ROOT ROUTE)
  // =========================================
  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "🚀 Civic AI Backend Running"
    });
  });

  // =========================================
  // ✅ OPTIONAL (HEALTH CHECK - useful for Render)
  // =========================================
  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      status: "OK"
    });
  });

  // =========================================
  // 🔗 API ROUTES
  // =========================================
  app.use(appConfig.apiPrefix, apiRouter);

  // ❌ Not found
  app.use(notFoundMiddleware);

  // ⚠️ Error handler
  app.use(errorMiddleware);

  return app;
};
