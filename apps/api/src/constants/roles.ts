import { UserRole } from "@prisma/client";

export const ROLE_VALUES = [
  UserRole.CITIZEN,
  UserRole.EMPLOYEE,
  UserRole.DEPARTMENT_ADMIN,
  UserRole.SUPER_ADMIN
] as const;

