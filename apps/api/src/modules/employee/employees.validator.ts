import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (maxLength: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(maxLength).optional()
  );

const optionalPhone = z.union([
  z.literal(""),
  z.string().trim().regex(/^\d{10}$/, {
    message: "Phone number must be a valid 10-digit value"
  })
]);

const optionalPincode = z.union([
  z.literal(""),
  z.string().trim().regex(/^\d{6}$/, {
    message: "Pincode must be a valid 6-digit value"
  })
]);

const optionalPassword = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .min(8)
    .max(64)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
      message: "Password must include uppercase, lowercase, and a number"
    })
    .optional()
);

export const employeeIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const employeeListQuerySchema = z.object({
  department: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional()
});

export const suggestedEmployeesQuerySchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, {
      message: "Pincode must be a valid 4 to 10 digit value"
    }),
  department: z.string().trim().max(120).optional()
});

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().optional(),
  password: optionalPassword,
  department: optionalText(120),
  category: optionalText(120),
  gender: optionalText(20),
  age: z.coerce.number().int().min(0).optional(),
  phone: optionalPhone.optional(),
  status: optionalText(40),
  dateOfBirth: z.string().date().optional(),
  aadharNumber: z.string().trim().regex(/^\d{12}$/).optional(),
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  permanentAddress: z.string().trim().max(500).optional(),
  temporaryAddress: z.string().trim().max(500).optional(),
  bankName: optionalText(120),
  ifscCode: optionalText(20),
  accountNumber: optionalText(50),
  guardianName: optionalText(120),
  relation: optionalText(120),
  guardianPhone: optionalPhone.optional(),
  pincode: optionalPincode.optional()
});

export const updateEmployeeSchema = z
  .object({
    name: optionalText(120),
    phone: optionalPhone.optional(),
    department: optionalText(120),
    category: optionalText(120),
    permanentAddress: z.string().trim().max(500).optional(),
    temporaryAddress: z.string().trim().max(500).optional(),
    guardianName: z.string().trim().max(120).optional(),
    guardianPhone: optionalPhone.optional(),
    pincode: optionalPincode.optional(),
    password: optionalPassword
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one editable field is required"
    }
  );
