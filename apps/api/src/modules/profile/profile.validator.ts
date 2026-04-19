import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (maxLength: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(maxLength).optional()
  );

const optionalPhone = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{10}$/, {
      message: "phone must be a valid 10-digit phone number"
    })
    .optional()
);

const optionalPincode = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{6}$/, {
      message: "pincode must be a valid 6-digit value"
    })
    .optional()
);

const optionalAadhar = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{12}$/, {
      message: "aadharNumber must be a valid 12-digit value"
    })
    .optional()
);

const optionalPan = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, {
      message: "panNumber must be a valid PAN value"
    })
    .transform((value) => value.toUpperCase())
    .optional()
);

const optionalLanguage = z.preprocess(
  emptyStringToUndefined,
  z
    .enum(["en", "hi", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa", "ur"])
    .optional()
);

const optionalBoolean = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return value;
  },
  z.boolean().optional()
);

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().date().optional()
);

export const profileUpsertSchema = z
  .object({
    name: optionalText(120),
    phone: optionalPhone,
    gender: optionalText(20),
    dateOfBirth: optionalDate,
    permanentAddress: optionalText(500),
    pincode: optionalPincode,
    aadharNumber: optionalAadhar,
    panNumber: optionalPan,
    language: optionalLanguage,
    showSanitaryFeature: optionalBoolean
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one profile field is required"
  });

export const profileEditableSchema = z
  .object({
    phone: optionalPhone,
    permanentAddress: optionalText(500),
    pincode: optionalPincode,
    language: optionalLanguage,
    showSanitaryFeature: optionalBoolean
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one editable profile field is required"
  });
