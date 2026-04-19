import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { TicketsService } from "./ticket.service";

const ticketsService = new TicketsService();

export class TicketsController {
  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const ticket = await ticketsService.createTicket(req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Ticket created",
      data: ticket
    });
  }

  async listByComplaint(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const tickets = await ticketsService.listComplaintTickets(req.params.complaintId, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint tickets fetched",
      data: tickets
    });
  }

  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const tickets = await ticketsService.listTickets(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Tickets fetched",
      data: tickets
    });
  }

  async approve(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const ticket = await ticketsService.approveTicket(req.params.id, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Ticket approved",
      data: ticket
    });
  }

  async reject(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const ticket = await ticketsService.rejectTicket(req.params.id, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Ticket rejected",
      data: ticket
    });
  }
}
