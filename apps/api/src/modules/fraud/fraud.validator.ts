import { ComplaintStatus } from "@prisma/client";
import { z } from "zod";

export const fraudAlertQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  reasonCode: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  minScore: z.coerce.number().min(0).max(1).optional()
});
