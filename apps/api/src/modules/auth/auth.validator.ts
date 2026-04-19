import { UserRole } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8)
    .max(64)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
      message: "Password must include uppercase, lowercase, and a number"
    }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, {
      message: "Phone number must contain only digits and may start with +"
    })
    .optional(),
  role: z
    .nativeEnum(UserRole)
    .refine((value) => value !== UserRole.SUPER_ADMIN, {
      message: "Super admin self-registration is not allowed."
    })
    .optional()
});

export const loginSchema = z.object({
  email: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(64),
  role: z.nativeEnum(UserRole).optional()
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1).optional()
});
