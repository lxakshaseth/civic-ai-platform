import { z } from "zod";

const optionalCoordinateSchema = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().finite().optional()
);

export const verifyTaskSchema = z
  .object({
    latitude: optionalCoordinateSchema,
    longitude: optionalCoordinateSchema
  })
  .superRefine((value, context) => {
    if ((value.latitude == null) !== (value.longitude == null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must be provided together",
        path: ["latitude"]
      });
    }
  });
