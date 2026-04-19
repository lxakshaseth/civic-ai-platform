import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { UsersService } from "./user.service";

const usersService = new UsersService();

export class UsersController {
  async listDepartments(_req: Request, res: Response) {
    const departments = await usersService.listDepartments();

    return sendSuccess(res, StatusCodes.OK, {
      message: "Departments fetched",
      data: departments
    });
  }

  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const users = await usersService.listUsers(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Users fetched",
      data: users
    });
  }

  async listEmployees(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employees = await usersService.listEmployees(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employees fetched",
      data: employees
    });
  }

  async listEmployeeDirectory(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employees = await usersService.listEmployeeDirectory(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee directory fetched",
      data: employees
    });
  }

  async getById(req: Request, res: Response) {
    const user = await usersService.getById(req.params.id, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "User fetched",
      data: user
    });
  }

  async getEmployeeDirectoryById(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employee = await usersService.getEmployeeDirectoryById(req.params.id, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee directory record fetched",
      data: employee
    });
  }

  async updateEmployeeDirectoryById(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const employee = await usersService.updateEmployeeDirectoryById(
      req.params.id,
      req.body,
      req.user,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee directory record updated",
      data: employee
    });
  }

  async updateRole(req: Request, res: Response) {
    const user = await usersService.updateRole(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "User updated",
      data: user
    });
  }
}
