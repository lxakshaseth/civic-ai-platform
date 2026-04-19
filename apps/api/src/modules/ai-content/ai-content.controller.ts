import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { AiContentService } from "./ai-content.service";

const aiContentService = new AiContentService();

export class AiContentController {
  async generate(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const item = await aiContentService.generate(req.user, req.body);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Daily boost generated",
      data: item
    });
  }

  async toggleLike(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const result = await aiContentService.toggleLike(req.user, req.params.id);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Daily boost like updated",
      data: result
    });
  }

  async toggleSave(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const result = await aiContentService.toggleSave(req.user, req.body.contentId);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Daily boost save updated",
      data: result
    });
  }

  async saved(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const savedItems = await aiContentService.listSaved(req.user, Number(req.query.limit ?? 4));

    return sendSuccess(res, StatusCodes.OK, {
      message: "Saved daily boosts fetched",
      data: savedItems
    });
  }
}
