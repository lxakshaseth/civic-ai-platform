import { EvidenceType } from "@prisma/client";
import { z } from "zod";

export const createEvidenceParamsSchema = z.object({
  complaintId: z.string().uuid()
});

export const createEvidenceSchema = z.object({
  type: z.nativeEnum(EvidenceType),
  note: z.string().max(500).optional(),
  invoiceVendorName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(120).optional(),
  invoiceDate: z
    .string()
    .max(50)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid invoice date")
    .optional(),
  invoiceAmount: z.coerce.number().nonnegative().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional()
});

export const evidenceIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const reviewEvidenceSchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED", "REVIEW_REQUIRED"]),
  reviewRemarks: z.string().max(500).optional()
}).refine(
  (data) =>
    data.verificationStatus === "APPROVED" || Boolean(data.reviewRemarks?.trim()),
  {
    message: "Review remarks are required when evidence is rejected or sent for further review",
    path: ["reviewRemarks"]
  }
);
