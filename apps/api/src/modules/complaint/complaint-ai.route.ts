import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ComplaintsController } from "./complaint.controller";
import { analyzeComplaintSchema } from "./complaint.validator";

const router = Router();
const controller = new ComplaintsController();

router.use(authenticate);
router.post(
  "/analyze-complaint",
  authorize(UserRole.CITIZEN),
  validate({ body: analyzeComplaintSchema }),
  asyncHandler(controller.analyzeDraft)
);

export { router as complaintAiRoutes };
