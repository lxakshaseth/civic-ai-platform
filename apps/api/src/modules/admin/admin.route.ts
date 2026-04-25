import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { assignComplaintApiSchema, complaintListQuerySchema } from "modules/complaint/complaint.validator";
import { asyncHandler } from "utils/async-handler";
import { employeeListQuerySchema } from "modules/employee/employees.validator";

import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();
const approveComplaintSchema = z.object({
  complaintId: z.string().uuid(),
  note: z.string().trim().max(500).optional()
});
const sanitaryRequestQuerySchema = z.object({
  status: z.string().trim().optional(),
  search: z.string().trim().optional()
});
const sanitaryRequestParamsSchema = z.object({
  id: z.string().trim().min(1)
});
const sanitaryApproveSchema = z.object({
  transactionId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional()
});
const sanitaryRejectSchema = z.object({
  note: z.string().trim().max(500).optional()
});
const sanitaryFlagSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(500).optional()
});

router.use(authenticate);
router.use(authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN));

router.get("/employees", validate({ query: employeeListQuerySchema }), asyncHandler(controller.listEmployees));
router.get("/dashboard", asyncHandler(controller.dashboard));
router.get(
  "/sanitary-summary",
  asyncHandler(controller.sanitarySummary)
);
router.get(
  "/sanitary-requests",
  validate({ query: sanitaryRequestQuerySchema }),
  asyncHandler(controller.sanitaryRequests)
);
router.get("/complaints", validate({ query: complaintListQuerySchema }), asyncHandler(controller.listComplaints));
router.post("/assign", validate({ body: assignComplaintApiSchema }), asyncHandler(controller.assign));
router.post("/approve", validate({ body: approveComplaintSchema }), asyncHandler(controller.approve));
router.patch(
  "/sanitary/:id/approve",
  validate({ params: sanitaryRequestParamsSchema, body: sanitaryApproveSchema }),
  asyncHandler(controller.approveSanitaryRequest)
);
router.patch(
  "/sanitary/:id/reject",
  validate({ params: sanitaryRequestParamsSchema, body: sanitaryRejectSchema }),
  asyncHandler(controller.rejectSanitaryRequest)
);
router.patch(
  "/sanitary/:id/flag",
  validate({ params: sanitaryRequestParamsSchema, body: sanitaryFlagSchema }),
  asyncHandler(controller.flagSanitaryRequest)
);
router.get("/stats", asyncHandler(controller.getStats));

export { router as adminRoutes };
