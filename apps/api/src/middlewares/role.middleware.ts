import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      if (process.env.NODE_ENV !== "production") {
        console.log("User:", req.user);
        console.log("Allowed roles:", allowedRoles);
      }

      void queueAuditLogJob({
        userId: req.user.id,
        action: "security.rbac_denied",
        entity: "Security",
        entityId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: {
          actorRole: req.user.role,
          allowedRoles,
          method: req.method,
          path: req.originalUrl
        }
      }).catch(() => undefined);

      return next(new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN"));
    }

    next();
  };
