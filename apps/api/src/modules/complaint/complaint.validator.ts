import { ComplaintStatus, EvidenceType } from "@prisma/client";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const structuredAddressSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return undefined;
    }

    try {
      return JSON.parse(trimmedValue);
    } catch {
      return value;
    }
  },
  z
    .object({
      houseNo: z.string().trim().min(1).max(80),
      street: z.string().trim().min(2).max(160),
      landmark: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().max(160).optional()
      ),
      area: z.string().trim().min(2).max(160),
      city: z.string().trim().min(2).max(120),
      pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be a valid 6-digit value")
    })
    .strict()
    .optional()
);

export const complaintIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const complaintListQuerySchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  departmentId: z.string().uuid().optional(),
  assignedEmployeeId: z.string().uuid().optional(),
  citizenId: z.string().uuid().optional(),
  pincode: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const normalizedValue = value.trim();
      return normalizedValue === "" ? undefined : normalizedValue;
    },
    z
      .string()
      .max(10, "Pincode must contain at most 10 digits")
      .regex(/^\d+$/, "Pincode must contain only digits")
      .optional()
  ),
  mine: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  category: z.string().max(120).optional(),
  priority: z.string().max(50).optional(),
  isSuspicious: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().max(160).optional()
});

export const nearbyComplaintsQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().positive().max(20).optional().default(5),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export const createComplaintSchema = z.object({
  title: z.string().min(5).max(160),
  description: z.string().min(10).max(2000),
  category: z.string().trim().min(2).max(120).optional(),
  priority: z.string().trim().max(50).optional(),
  departmentName: z.string().trim().min(2).max(120).optional(),
  pincode: z
    .preprocess(
      emptyStringToUndefined,
      z.string().trim().regex(/^\d{6}$/, "Pincode must be a valid 6-digit value").optional()
    ),
  locationAddress: z.string().min(3).max(255).optional(),
  structuredAddress: structuredAddressSchema,
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  departmentId: z.string().uuid().optional()
}).superRefine((value, ctx) => {
  if ((value.latitude == null) !== (value.longitude == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: value.latitude == null ? ["latitude"] : ["longitude"],
      message: "Latitude and longitude must be provided together"
    });
  }

  if (!value.locationAddress && !value.structuredAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["structuredAddress"],
      message: "Structured address is required"
    });
  }

  if (
    value.pincode &&
    value.structuredAddress?.pincode &&
    value.pincode.trim() !== value.structuredAddress.pincode.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pincode"],
      message: "Pincode must match the structured address"
    });
  }
});

export const analyzeComplaintSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(2000)
});

export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  note: z.string().max(500).optional()
});

export const assignComplaintSchema = z.object({
  employeeId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  note: z.string().max(500).optional()
});

export const assignComplaintApiSchema = assignComplaintSchema.extend({
  complaintId: z.string().uuid()
});

export const smartAssignTicketSchema = z
  .object({
    complaintId: z.string().uuid().optional(),
    complaint_id: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    employee_id: z.string().uuid().optional(),
    note: z.string().trim().max(500).optional(),
    autoAssign: z.coerce.boolean().optional(),
    auto_assign: z.coerce.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.complaintId && !value.complaint_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["complaintId"],
        message: "complaintId is required"
      });
    }
  })
  .transform((value) => ({
    complaintId: value.complaintId ?? value.complaint_id ?? "",
    employeeId: value.employeeId ?? value.employee_id,
    note: value.note,
    autoAssign: value.autoAssign ?? value.auto_assign ?? false
  }));

export const addComplaintCommentSchema = z.object({
  comment: z.string().min(2).max(1000)
});

export const reopenComplaintSchema = z.object({
  reason: z.string().min(3).max(500)
});

export const complaintFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

export const employeeTaskQuerySchema = complaintListQuerySchema.pick({
  status: true,
  category: true,
  priority: true,
  search: true
});

export const submitComplaintProofSchema = z.object({
  type: z.nativeEnum(EvidenceType),
  note: z.string().trim().min(2).max(500),
  invoiceVendorName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(120).optional(),
  invoiceDate: z
    .string()
    .max(50)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid invoice date")
    .optional(),
  invoiceAmount: z.coerce.number().nonnegative().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  markAsCompleted: z.coerce.boolean().optional().default(true)
}).superRefine((value, ctx) => {
  if ((value.latitude == null) !== (value.longitude == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: value.latitude == null ? ["latitude"] : ["longitude"],
      message: "Latitude and longitude must be provided together"
    });
  }
});

export const completeComplaintSchema = z.object({
  notes: z.string().trim().min(2).max(500),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  laborCount: z.coerce.number().int().min(1).max(1000).optional(),
  billAmount: z.coerce.number().nonnegative().optional(),
  invoiceVendorName: z.string().trim().max(255).optional(),
  invoiceNumber: z.string().trim().max(120).optional(),
  invoiceDate: z
    .string()
    .max(50)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid invoice date")
    .optional(),
  materialsUsed: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  if ((value.latitude == null) !== (value.longitude == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: value.latitude == null ? ["latitude"] : ["longitude"],
      message: "Latitude and longitude must be provided together"
    });
  }
});

export const verifyComplaintSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  if (value.action === "reject" && !value.note) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["note"],
      message: "A rejection reason is required when sending work back to the employee"
    });
  }
});
