import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { UsersController } from "./user.controller";
import {
  employeeDirectoryIdParamsSchema,
  employeeDirectoryListQuerySchema,
  updateEmployeeDirectorySchema,
  updateUserRoleSchema,
  userIdParamsSchema,
  userListQuerySchema
} from "./user.validator";

const router = Router();
const controller = new UsersController();

router.use(authenticate);

router.get("/departments", asyncHandler(controller.listDepartments));
router.get(
  "/",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: userListQuerySchema }),
  asyncHandler(controller.list)
);
router.get(
  "/employees",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: userListQuerySchema.omit({ role: true }) }),
  asyncHandler(controller.listEmployees)
);
router.get(
  "/registry/employees",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ query: employeeDirectoryListQuerySchema }),
  asyncHandler(controller.listEmployeeDirectory)
);
router.get(
  "/registry/employees/:id",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: employeeDirectoryIdParamsSchema }),
  asyncHandler(controller.getEmployeeDirectoryById)
);
router.put(
  "/registry/employees/:id",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: employeeDirectoryIdParamsSchema, body: updateEmployeeDirectorySchema }),
  asyncHandler(controller.updateEmployeeDirectoryById)
);
router.get("/:id", validate({ params: userIdParamsSchema }), asyncHandler(controller.getById));
router.patch(
  "/:id/role",
  authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN),
  validate({ params: userIdParamsSchema, body: updateUserRoleSchema }),
  asyncHandler(controller.updateRole)
);

export { router as usersRoutes };
