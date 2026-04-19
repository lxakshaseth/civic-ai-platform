import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { sendSuccess } from "utils/api-response";

import { FraudService } from "./fraud.service";

const fraudService = new FraudService();

export class FraudController {
  async listAlerts(req: Request, res: Response) {
    const alerts = await fraudService.listAlerts(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Fraud alerts fetched",
      data: alerts
    });
  }

  async summary(req: Request, res: Response) {
    const summary = await fraudService.getSummary(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Fraud summary fetched",
      data: summary
    });
  }
}

