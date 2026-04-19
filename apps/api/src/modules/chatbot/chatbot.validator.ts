import { z } from "zod";

export const chatbotSessionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(18)
});

export const chatbotMessageSchema = z.object({
  message: z.string().trim().min(2).max(1000)
});
