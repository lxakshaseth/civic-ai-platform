import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalLatitude = z.preprocess(
  emptyStringToUndefined,
  z
    .coerce
    .number()
    .refine((value) => value >= -90 && value <= 90)
    .optional()
);

const optionalLongitude = z.preprocess(
  emptyStringToUndefined,
  z
    .coerce
    .number()
    .refine((value) => value >= -180 && value <= 180)
    .optional()
);

export const emergencyNearbyQuerySchema = z
  .object({
    lat: optionalLatitude,
    lng: optionalLongitude,
    pincode: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .trim()
        .regex(/^\d{6}$/)
        .optional()
    ),
    language: z.enum(["en", "hi", "mr"]).optional()
  })
  .strict()
  .refine(
    (value) =>
      (typeof value.lat === "number" && typeof value.lng === "number") ||
      (value.lat === undefined && value.lng === undefined),
    {
      message: "lat and lng must be provided together",
      path: ["lat"]
    }
  );
