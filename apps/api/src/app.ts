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

  app.use(
    cors({
      origin: appConfig.corsOrigins,
      credentials: true
    })
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      },
      frameguard: false
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLoggerMiddleware);
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.NODE_ENV === "production" ? env.RATE_LIMIT_MAX : env.RATE_LIMIT_MAX * 10,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => env.NODE_ENV !== "production" && req.path.endsWith("/auth/me")
    })
  );
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

  app.use(appConfig.apiPrefix, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
