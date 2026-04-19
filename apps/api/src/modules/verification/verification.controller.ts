import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { VerificationService } from "./verification.service";

const verificationService = new VerificationService();

type UploadedVerificationFiles = Partial<Record<"beforeImage" | "afterImage", Express.Multer.File[]>>;

export class VerificationController {
  async verifyTask(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const files = (req.files as UploadedVerificationFiles | undefined) ?? {};
    const beforeImage = files.beforeImage?.[0];
    const afterImage = files.afterImage?.[0];

    if (!beforeImage || !afterImage) {
      throw new AppError(
        "beforeImage and afterImage files are required",
        StatusCodes.BAD_REQUEST,
        "FILE_REQUIRED"
      );
    }

    const verificationResult = await verificationService.verifyTask({
      beforeImage,
      afterImage,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Task verification completed",
      data: verificationResult
    });
  }
}
