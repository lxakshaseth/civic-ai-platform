import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const aiContentRequestSchema = z
  .object({
    type: z.enum(["joke", "thought", "tip", "quote"]),
    mood: z.enum(["happy", "stress", "angry"]),
    language: z.enum(["en", "hi", "mr"]),
    pincode: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .trim()
        .regex(/^\d{6}$/)
        .optional()
    ),
    forceRefresh: z.coerce.boolean().optional()
  })
  .strict();

export const aiContentIdParamsSchema = z
  .object({
    id: z.string().uuid()
  })
  .strict();

export const saveContentBodySchema = z
  .object({
    contentId: z.string().uuid()
  })
  .strict();

export const savedContentQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(12).default(4)
  })
  .strict();
