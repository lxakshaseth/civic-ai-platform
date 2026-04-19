import { ComplaintStatus } from "@prisma/client";
import { z } from "zod";

export const employeeTasksQuerySchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  priority: z.string().trim().min(1).max(32).optional(),
  search: z.string().trim().min(1).max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const employeeDashboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).optional()
});

export const employeePerformanceQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(12).optional()
});

export const employeeUploadProofSchema = z
  .object({
    complaintId: z.string().uuid(),
    note: z.string().trim().min(2).max(500),
    markAsCompleted: z.coerce.boolean().optional().default(true),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional()
  })
  .superRefine((value, ctx) => {
    if ((value.latitude == null) !== (value.longitude == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.latitude == null ? ["latitude"] : ["longitude"],
        message: "Latitude and longitude must be provided together"
      });
    }
  });

export const employeeAiAssistantSchema = z.object({
  question: z.string().trim().min(3).max(2000)
});
