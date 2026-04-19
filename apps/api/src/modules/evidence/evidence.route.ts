import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { evidenceUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { EvidenceController } from "./evidence.controller";
import {
  createEvidenceParamsSchema,
  createEvidenceSchema,
  evidenceIdParamsSchema,
  reviewEvidenceSchema
} from "./evidence.validator";

const router = Router();
const controller = new EvidenceController();

router.use(authenticate);

router.post(
  "/:complaintId",
  authorize(UserRole.EMPLOYEE, UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  evidenceUpload.single("file"),
  validate({ params: createEvidenceParamsSchema, body: createEvidenceSchema }),
  asyncHandler(controller.create)
);
router.get("/:complaintId", validate({ params: createEvidenceParamsSchema }), asyncHandler(controller.list));
router.patch(
  "/item/:id/review",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: evidenceIdParamsSchema, body: reviewEvidenceSchema }),
  asyncHandler(controller.review)
);

export { router as evidenceRoutes };
