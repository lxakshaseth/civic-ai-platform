import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { AdminService } from "./admin.service";

const adminService = new AdminService();

export class AdminController {
  async listEmployees(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employees = await adminService.listEmployees(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Admin employees fetched",
      data: employees
    });
  }

  async dashboard(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const stats = await adminService.getDashboard();

    return sendSuccess(res, StatusCodes.OK, {
      message: "Admin dashboard fetched",
      data: stats
    });
  }

  async getStats(_req: Request, res: Response) {
    const stats = await adminService.getStats();

    return sendSuccess(res, StatusCodes.OK, {
      message: "Admin stats fetched",
      data: stats
    });
  }

  async listComplaints(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await adminService.listComplaints(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Admin complaints fetched",
      data: complaints
    });
  }

  async assign(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await adminService.assignComplaint(req.user, req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint assigned",
      data: complaint
    });
  }

  async approve(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await adminService.approveComplaint(req.user, req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint approved",
      data: complaint
    });
  }

  async sanitarySummary(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const summary = await adminService.getSanitarySummary(req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Sanitary reimbursement summary fetched",
      data: summary
    });
  }

  async sanitaryRequests(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const requests = await adminService.listSanitaryRequests(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Sanitary reimbursement requests fetched",
      data: requests
    });
  }

  async approveSanitaryRequest(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const requestRecord = await adminService.approveSanitaryRequest(req.user, req.params.id, req.body);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Sanitary reimbursement marked as paid",
      data: requestRecord
    });
  }

  async rejectSanitaryRequest(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const requestRecord = await adminService.rejectSanitaryRequest(req.user, req.params.id, req.body);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Sanitary reimbursement rejected",
      data: requestRecord
    });
  }

  async flagSanitaryRequest(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const requestRecord = await adminService.flagSanitaryRequest(req.user, req.params.id, req.body);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Sanitary reimbursement flagged",
      data: requestRecord
    });
  }
}
