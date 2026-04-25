import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";
import { verifyAccessToken } from "utils/token";
import { logger } from "utils/logger";

const logSecurityEvent = (req: Request, reason: string, metadata?: Record<string, unknown>) => {
  void queueAuditLogJob({
    userId: req.user?.id,
    action: "security.auth_failed",
    entity: "Security",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: {
      reason,
      method: req.method,
      path: req.originalUrl,
      ...metadata
    }
  }).catch(() => undefined);
};

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const token = bearerToken ?? req.cookies?.accessToken;

  if (!token) {
    logSecurityEvent(req, "missing_token");
    return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };

    if (process.env.NODE_ENV !== "production") {
      logger.debug({ userId: payload.id, role: payload.role }, "Authenticated request");
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    logSecurityEvent(req, "invalid_token");
    next(new AppError("Invalid or expired token", StatusCodes.UNAUTHORIZED, "INVALID_TOKEN"));
  }
};
