import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { complaintUpload, evidenceUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ComplaintsController } from "./complaint.controller";
import {
  addComplaintCommentSchema,
  assignComplaintSchema,
  complaintIdParamsSchema,
  complaintFeedbackSchema,
  complaintListQuerySchema,
  completeComplaintSchema,
  createComplaintSchema,
  employeeTaskQuerySchema,
  nearbyComplaintsQuerySchema,
  reopenComplaintSchema,
  submitComplaintProofSchema,
  updateComplaintStatusSchema,
  verifyComplaintSchema
} from "./complaint.validator";

const router = Router();
const controller = new ComplaintsController();

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.CITIZEN),
  complaintUpload.fields([
    { name: "images", maxCount: 10 },
    { name: "image", maxCount: 1 }
  ]),
  validate({ body: createComplaintSchema }),
  asyncHandler(controller.create)
);
router.get("/", validate({ query: complaintListQuerySchema }), asyncHandler(controller.list));
router.get(
  "/admin/issues",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: complaintListQuerySchema }),
  asyncHandler(controller.listAdminIssues)
);
router.get(
  "/unassigned",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(controller.listUnassigned)
);
router.get(
  "/employee/tasks",
  authorize(UserRole.EMPLOYEE),
  validate({ query: employeeTaskQuerySchema }),
  asyncHandler(controller.listEmployeeTasks)
);
router.get(
  "/nearby",
  authorize(UserRole.EMPLOYEE, UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: nearbyComplaintsQuerySchema }),
  asyncHandler(controller.listNearby)
);
router.get("/:id", validate({ params: complaintIdParamsSchema }), asyncHandler(controller.getById));
router.patch(
  "/:id/status",
  authorize(UserRole.EMPLOYEE, UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: complaintIdParamsSchema, body: updateComplaintStatusSchema }),
  asyncHandler(controller.updateStatus)
);
router.post(
  "/:id/proof",
  authorize(UserRole.EMPLOYEE),
  evidenceUpload.single("file"),
  validate({ params: complaintIdParamsSchema, body: submitComplaintProofSchema }),
  asyncHandler(controller.submitProof)
);
router.put(
  "/:id/complete",
  authorize(UserRole.EMPLOYEE),
  evidenceUpload.fields([
    { name: "proofImages", maxCount: 10 },
    { name: "invoice", maxCount: 1 }
  ]),
  validate({ params: complaintIdParamsSchema, body: completeComplaintSchema }),
  asyncHandler(controller.complete)
);
router.post(
  "/:id/assign",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: complaintIdParamsSchema, body: assignComplaintSchema }),
  asyncHandler(controller.assign)
);
router.post(
  "/:id/verify",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: complaintIdParamsSchema, body: verifyComplaintSchema }),
  asyncHandler(controller.verify)
);
router.put(
  "/:id/verify",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: complaintIdParamsSchema, body: verifyComplaintSchema }),
  asyncHandler(controller.verify)
);
router.get("/:id/timeline", validate({ params: complaintIdParamsSchema }), asyncHandler(controller.timeline));
router.get(
  "/:id/comments",
  validate({ params: complaintIdParamsSchema }),
  asyncHandler(controller.listComments)
);
router.post(
  "/:id/comments",
  validate({ params: complaintIdParamsSchema, body: addComplaintCommentSchema }),
  asyncHandler(controller.addComment)
);
router.post(
  "/:id/reopen",
  authorize(UserRole.CITIZEN),
  validate({ params: complaintIdParamsSchema, body: reopenComplaintSchema }),
  asyncHandler(controller.reopen)
);
router.post(
  "/:id/feedback",
  authorize(UserRole.CITIZEN),
  validate({ params: complaintIdParamsSchema, body: complaintFeedbackSchema }),
  asyncHandler(controller.feedback)
);

export { router as complaintsRoutes };
