import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { EmployeesController } from "./employees.controller";
import {
  createEmployeeSchema,
  employeeIdParamsSchema,
  employeeListQuerySchema,
  suggestedEmployeesQuerySchema,
  updateEmployeeSchema
} from "./employees.validator";

const router = Router();
const controller = new EmployeesController();

router.use(authenticate);
router.use(authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN));

router.post("/", validate({ body: createEmployeeSchema }), asyncHandler(controller.create));
router.get("/", validate({ query: employeeListQuerySchema }), asyncHandler(controller.list));
router.get(
  "/suggested",
  validate({ query: suggestedEmployeesQuerySchema }),
  asyncHandler(controller.listSuggested)
);
router.get(
  "/:id",
  validate({ params: employeeIdParamsSchema }),
  asyncHandler(controller.getById)
);
router.put(
  "/:id",
  validate({ params: employeeIdParamsSchema, body: updateEmployeeSchema }),
  asyncHandler(controller.update)
);

export { router as employeesRoutes };
