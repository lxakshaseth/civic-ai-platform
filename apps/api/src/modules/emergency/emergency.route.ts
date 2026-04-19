import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { EmergencyController } from "./emergency.controller";
import { emergencyNearbyQuerySchema } from "./emergency.validator";

const router = Router();
const controller = new EmergencyController();

router.use(authenticate);
router.use(authorize(UserRole.CITIZEN));

router.get(
  "/nearby",
  validate({ query: emergencyNearbyQuerySchema }),
  asyncHandler(controller.nearby)
);

export { router as emergencyRoutes };
