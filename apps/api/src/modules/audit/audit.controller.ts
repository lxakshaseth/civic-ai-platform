import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { sendSuccess } from "utils/api-response";

import { AuditService } from "./audit.service";

const auditService = new AuditService();

export class AuditController {
  async list(req: Request, res: Response) {
    const logs = await auditService.listLogs(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Audit logs fetched",
      data: logs
    });
  }
}
