import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { verificationUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { VerificationController } from "./verification.controller";
import { verifyTaskSchema } from "./verification.validator";

const router = Router();
const controller = new VerificationController();

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.EMPLOYEE, UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  verificationUpload.fields([
    { name: "beforeImage", maxCount: 1 },
    { name: "afterImage", maxCount: 1 }
  ]),
  validate({ body: verifyTaskSchema }),
  asyncHandler(controller.verifyTask)
);

export { router as verificationRoutes };
