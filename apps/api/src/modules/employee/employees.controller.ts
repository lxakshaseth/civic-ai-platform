import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { AdminService } from "../admin/admin.service";
import { EmployeesService } from "./employees.service";

const employeesService = new EmployeesService();
const adminService = new AdminService();

export class EmployeesController {
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employee = await employeesService.createEmployee(req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Employee created",
      data: employee
    });
  }

  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employees = await employeesService.listEmployees(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employees fetched",
      data: employees
    });
  }

  async listSuggested(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employees = await adminService.listSuggestedEmployees(
      req.user,
      String(req.query.pincode),
      typeof req.query.department === "string" ? req.query.department : undefined
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Suggested employees fetched",
      data: employees
    });
  }

  async getById(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employee = await employeesService.getById(req.params.id, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee fetched",
      data: employee
    });
  }

  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employee = await employeesService.updateById(
      req.params.id,
      req.body,
      req.user,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee updated",
      data: employee
    });
  }
}
