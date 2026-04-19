import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { EvidenceService } from "./evidence.service";

const evidenceService = new EvidenceService();

export class EvidenceController {
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const evidence = await evidenceService.createEvidence(
      req.params.complaintId,
      req.body,
      req.user.id,
      req.file,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Evidence uploaded",
      data: evidence
    });
  }

  async list(req: Request, res: Response) {
    const evidence = await evidenceService.listByComplaint(req.params.complaintId, req.user?.id);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Evidence fetched",
      data: evidence
    });
  }

  async review(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const evidence = await evidenceService.reviewEvidence(req.params.id, req.body, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Evidence reviewed",
      data: evidence
    });
  }
}
