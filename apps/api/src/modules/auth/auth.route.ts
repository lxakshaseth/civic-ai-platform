import { Router } from "express";
import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

import { env } from "config/env";
import { authenticate } from "middlewares/auth.middleware";
import { validate } from "middlewares/validate-request";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { asyncHandler } from "utils/async-handler";

import { AuthController } from "./auth.controller";
import { loginSchema, refreshTokenSchema, registerSchema } from "./auth.validator";

const router = Router();
const controller = new AuthController();
const authRateLimitMax = Math.max(5, Math.ceil(env.RATE_LIMIT_MAX / 10));
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    void queueAuditLogJob({
      action: "security.rate_limit_exceeded",
      entity: "Security",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {
        limiter: "auth",
        method: req.method,
        path: req.originalUrl,
        maxAttempts: authRateLimitMax
      }
    }).catch(() => undefined);

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      message: "Too many authentication attempts. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      details: null
    });
  }
});

router.post("/register", authRateLimiter, validate({ body: registerSchema }), asyncHandler(controller.register));
router.post("/login", authRateLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
router.post("/refresh", authRateLimiter, validate({ body: refreshTokenSchema }), asyncHandler(controller.refresh));
router.post("/logout", validate({ body: refreshTokenSchema }), asyncHandler(controller.logout));
router.get("/me", authenticate, asyncHandler(controller.me));

export { router as authRoutes };
