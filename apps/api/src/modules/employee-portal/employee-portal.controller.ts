import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { EmployeePortalService } from "./employee-portal.service";

const employeePortalService = new EmployeePortalService();

const getFieldFiles = (req: Request, fieldName: string) => {
  if (!req.files || Array.isArray(req.files)) {
    return [];
  }

  const files = (req.files as Record<string, Express.Multer.File[]>)[fieldName];
  return Array.isArray(files) ? files : [];
};

const getFieldFile = (req: Request, fieldName: string) => getFieldFiles(req, fieldName)[0];

export class EmployeePortalController {
  async dashboard(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await employeePortalService.getDashboard(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee dashboard fetched",
      data
    });
  }

  async tasks(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await employeePortalService.listEmployeeTasks(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee tasks fetched",
      data
    });
  }

  async uploadProof(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await employeePortalService.uploadProof(
      req.user,
      req.body,
      {
        beforeImages: getFieldFiles(req, "beforeImages"),
        afterImages: getFieldFiles(req, "afterImages"),
        invoice: getFieldFile(req, "invoice")
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee proof uploaded",
      data
    });
  }

  async performance(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await employeePortalService.getPerformance(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee performance fetched",
      data
    });
  }

  async assistant(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const data = await employeePortalService.askAssistant(req.user, req.body);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee AI assistant response generated",
      data
    });
  }
}
