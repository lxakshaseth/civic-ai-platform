import { z } from "zod";

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const markNotificationsReadSchema = z.object({
  id: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).max(50).optional()
});
