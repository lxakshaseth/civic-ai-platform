import { z } from "zod";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const nullableText = (maxLength: number) =>
  z.preprocess(
    emptyStringToNull,
    z.string().trim().max(maxLength).nullable().optional()
  );

const nullablePhone = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .trim()
    .regex(/^\d{10}$/, {
      message: "guardianPhone must be a valid 10-digit phone number"
    })
    .nullable()
    .optional()
);

export const userIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const employeeDirectoryIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const userListQuerySchema = z.object({
  role: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => ["CITIZEN", "EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(value), {
      message: "role must be one of CITIZEN, EMPLOYEE, ADMIN, or SUPER_ADMIN"
    })
    .optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().max(120).optional()
});

export const employeeDirectoryListQuerySchema = z.object({
  department: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional()
});

export const updateEmployeeDirectorySchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(120),
    phone: z.string().trim().regex(/^\d{10}$/, {
      message: "phone must be a valid 10-digit phone number"
    }),
    department: nullableText(120),
    status: nullableText(40),
    permanentAddress: nullableText(500),
    temporaryAddress: nullableText(500),
    bankName: nullableText(120),
    ifscCode: nullableText(20),
    accountNumber: nullableText(50),
    guardianName: nullableText(120),
    relation: nullableText(120),
    guardianPhone: nullablePhone
  })
  .strict();

export const updateUserRoleSchema = z.object({
  role: z.enum(["CITIZEN", "EMPLOYEE", "DEPARTMENT_ADMIN", "SUPER_ADMIN"]),
  departmentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (
    (value.role === "EMPLOYEE" || value.role === "DEPARTMENT_ADMIN") &&
    !value.departmentId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["departmentId"],
      message: "departmentId is required for employee and department admin roles"
    });
  }

  if (
    (value.role === "CITIZEN" || value.role === "SUPER_ADMIN") &&
    value.departmentId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["departmentId"],
      message: "departmentId is not allowed for citizen or super admin roles"
    });
  }
});
