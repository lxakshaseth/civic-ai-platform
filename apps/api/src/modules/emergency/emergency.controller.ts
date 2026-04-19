import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { EmergencyService } from "./emergency.service";

const emergencyService = new EmergencyService();

export class EmergencyController {
  async nearby(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await emergencyService.getNearby(req.user, {
      lat: typeof req.query.lat === "number" ? req.query.lat : undefined,
      lng: typeof req.query.lng === "number" ? req.query.lng : undefined,
      pincode: typeof req.query.pincode === "string" ? req.query.pincode : undefined,
      language:
        typeof req.query.language === "string"
          ? (req.query.language as "en" | "hi" | "mr")
          : undefined
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Emergency support fetched",
      data
    });
  }
}
