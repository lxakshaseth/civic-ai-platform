import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { TicketsController } from "./ticket.controller";
import {
  createTicketSchema,
  ticketComplaintParamsSchema,
  ticketIdParamsSchema,
  ticketListQuerySchema
} from "./ticket.validator";

const router = Router();
const controller = new TicketsController();

router.use(authenticate);

router.get(
  "/",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: ticketListQuerySchema }),
  asyncHandler(controller.list)
);
router.post(
  "/",
  authorize(UserRole.CITIZEN),
  validate({ body: createTicketSchema }),
  asyncHandler(controller.create)
);
router.put(
  "/:id/approve",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: ticketIdParamsSchema }),
  asyncHandler(controller.approve)
);
router.put(
  "/:id/reject",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: ticketIdParamsSchema }),
  asyncHandler(controller.reject)
);
router.get(
  "/:complaintId",
  validate({ params: ticketComplaintParamsSchema }),
  asyncHandler(controller.listByComplaint)
);

export { router as ticketsRoutes };
