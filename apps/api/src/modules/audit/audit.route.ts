import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { AuditController } from "./audit.controller";
import { auditLogQuerySchema } from "./audit.validator";

const router = Router();
const controller = new AuditController();

router.use(authenticate);
router.use(authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN));

router.get("/", validate({ query: auditLogQuerySchema }), asyncHandler(controller.list));

export { router as auditRoutes };
