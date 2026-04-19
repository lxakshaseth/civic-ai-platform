import { z } from "zod";

const optionalDateString = z
  .string()
  .max(50)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value")
  .optional();

export const analyticsQuerySchema = z
  .object({
    from: optionalDateString,
    to: optionalDateString,
    interval: z.enum(["day", "week", "month"]).default("day").optional(),
    category: z.string().trim().min(1).max(120).optional(),
    departmentId: z.string().uuid().optional(),
    geoView: z.enum(["area", "grid", "zone"]).default("area").optional(),
    precision: z.coerce.number().int().min(1).max(5).default(2).optional(),
    minCount: z.coerce.number().int().min(1).max(500).default(1).optional(),
    minLatitude: z.coerce.number().min(-90).max(90).optional(),
    maxLatitude: z.coerce.number().min(-90).max(90).optional(),
    minLongitude: z.coerce.number().min(-180).max(180).optional(),
    maxLongitude: z.coerce.number().min(-180).max(180).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(20).optional()
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }

      return new Date(data.from).getTime() <= new Date(data.to).getTime();
    },
    {
      message: "`from` must be before or equal to `to`",
      path: ["from"]
    }
  )
  .refine(
    (data) => {
      if ((data.minLatitude == null) !== (data.maxLatitude == null)) {
        return false;
      }

      return true;
    },
    {
      message: "Both `minLatitude` and `maxLatitude` must be provided together",
      path: ["minLatitude"]
    }
  )
  .refine(
    (data) => {
      if ((data.minLongitude == null) !== (data.maxLongitude == null)) {
        return false;
      }

      return true;
    },
    {
      message: "Both `minLongitude` and `maxLongitude` must be provided together",
      path: ["minLongitude"]
    }
  )
  .refine(
    (data) => {
      if (data.minLatitude == null || data.maxLatitude == null) {
        return true;
      }

      return data.minLatitude <= data.maxLatitude;
    },
    {
      message: "`minLatitude` must be less than or equal to `maxLatitude`",
      path: ["minLatitude"]
    }
  )
  .refine(
    (data) => {
      if (data.minLongitude == null || data.maxLongitude == null) {
        return true;
      }

      return data.minLongitude <= data.maxLongitude;
    },
    {
      message: "`minLongitude` must be less than or equal to `maxLongitude`",
      path: ["minLongitude"]
    }
  );

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
