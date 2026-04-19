import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { FraudController } from "./fraud.controller";
import { fraudAlertQuerySchema } from "./fraud.validator";

const router = Router();
const controller = new FraudController();

router.use(authenticate);
router.use(authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN));

router.get("/alerts", validate({ query: fraudAlertQuerySchema }), asyncHandler(controller.listAlerts));
router.get("/summary", validate({ query: fraudAlertQuerySchema }), asyncHandler(controller.summary));

export { router as fraudRoutes };

