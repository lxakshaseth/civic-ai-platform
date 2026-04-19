import { z } from "zod";

export const complaintChatParamsSchema = z.object({
  complaintId: z.string().uuid()
});

export const sendComplaintChatMessageSchema = z.object({
  complaintId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
  receiverId: z.string().uuid().optional()
});

export const sendComplaintVoiceMessageSchema = z.object({
  complaintId: z.string().uuid(),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  receiverId: z.string().uuid().optional(),
  durationMs: z.preprocess(
    (value) => {
      if (value == null || value === "") {
        return undefined;
      }

      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : value;
    },
    z.number().int().min(0).max(10 * 60 * 1000).optional()
  )
});

export const translateComplaintChatMessageSchema = z.object({
  complaintId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
  targetLanguage: z.string().trim().min(2).max(16),
  sourceLanguage: z.string().trim().min(2).max(16).optional()
});
