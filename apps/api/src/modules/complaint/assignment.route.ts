import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ComplaintsController } from "./complaint.controller";
import { smartAssignTicketSchema } from "./complaint.validator";

const router = Router();
const controller = new ComplaintsController();

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: smartAssignTicketSchema }),
  asyncHandler(controller.assignTicket)
);

export { router as complaintAssignmentRoutes };
