import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { ChatbotService } from "./chatbot.service";

const chatbotService = new ChatbotService();

export class ChatbotController {
  async publicSession(_req: Request, res: Response) {
    const session = await chatbotService.getPublicSession();

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public chatbot session fetched",
      data: session
    });
  }

  async session(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const session = await chatbotService.getSession(req.user, Number(req.query.limit ?? 18));

    return sendSuccess(res, StatusCodes.OK, {
      message: "Chatbot session fetched",
      data: session
    });
  }

  async sendMessage(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const reply = await chatbotService.sendMessage(req.user, req.body.message, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Chatbot response created",
      data: reply
    });
  }

  async sendPublicMessage(req: Request, res: Response) {
    const reply = await chatbotService.sendPublicMessage(req.body.message);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Public chatbot response created",
      data: reply
    });
  }
}
