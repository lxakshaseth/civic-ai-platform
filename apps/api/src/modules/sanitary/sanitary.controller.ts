import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { SanitaryService } from "./sanitary.service";

const sanitaryService = new SanitaryService();

export class SanitaryController {
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const requestRecord = await sanitaryService.createRequest(
      req.user,
      req.body,
      req.file,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.CREATED, {
      message: requestRecord.message,
      data: requestRecord
    });
  }
}
