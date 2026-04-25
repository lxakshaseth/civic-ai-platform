import { z } from "zod";

export const createSanitaryRequestSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pincode must be a valid 6-digit code"),
  storeId: z.string().trim().min(1),
  storeName: z.string().trim().min(1).max(200),
  invoiceNumber: z.string().trim().min(1).max(120),
  purchaseAmount: z.coerce.number().positive().max(10000),
  reimbursementLimit: z.coerce.number().positive().max(10000),
  upiId: z.string().trim().min(3).max(160)
});
