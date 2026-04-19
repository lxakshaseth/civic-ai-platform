import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { evidenceUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { EmployeePortalController } from "./employee-portal.controller";
import {
  employeeAiAssistantSchema,
  employeeDashboardQuerySchema,
  employeePerformanceQuerySchema,
  employeeTasksQuerySchema,
  employeeUploadProofSchema
} from "./employee-portal.validator";

const router = Router();
const assistantRouter = Router();
const controller = new EmployeePortalController();

router.use(authenticate);
router.use(authorize(UserRole.EMPLOYEE));
assistantRouter.use(authenticate);
assistantRouter.use(authorize(UserRole.EMPLOYEE));

router.get(
  "/dashboard",
  validate({ query: employeeDashboardQuerySchema }),
  asyncHandler(controller.dashboard)
);
router.get(
  "/tasks",
  validate({ query: employeeTasksQuerySchema }),
  asyncHandler(controller.tasks)
);
router.post(
  "/upload-proof",
  evidenceUpload.fields([
    { name: "beforeImages", maxCount: 10 },
    { name: "afterImages", maxCount: 10 },
    { name: "invoice", maxCount: 1 }
  ]),
  validate({ body: employeeUploadProofSchema }),
  asyncHandler(controller.uploadProof)
);
router.get(
  "/performance",
  validate({ query: employeePerformanceQuerySchema }),
  asyncHandler(controller.performance)
);
router.post(
  "/ai-assistant",
  validate({ body: employeeAiAssistantSchema }),
  asyncHandler(controller.assistant)
);
assistantRouter.post(
  "/",
  validate({ body: employeeAiAssistantSchema }),
  asyncHandler(controller.assistant)
);

export { router as employeePortalRoutes };
export { assistantRouter as employeeAssistantRoutes };
