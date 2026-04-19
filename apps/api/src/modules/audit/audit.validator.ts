import { z } from "zod";

const optionalDateString = z
  .string()
  .max(50)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value")
  .optional();

export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  entity: z.string().max(120).optional(),
  entityType: z.string().max(120).optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().max(160).optional(),
  from: optionalDateString,
  to: optionalDateString,
  limit: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional()
}).refine(
  (data) => {
    if (!data.from || !data.to) {
      return true;
    }

    return new Date(data.from).getTime() <= new Date(data.to).getTime();
  },
  {
    message: "`from` must be before or equal to `to`",
    path: ["from"]
  }
);

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
