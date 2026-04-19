import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { ComplaintChatService } from "./chat.service";

const complaintChatService = new ComplaintChatService();

export class ComplaintChatController {
  async history(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const messages = await complaintChatService.listComplaintChat(req.params.complaintId, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint chat history fetched",
      data: messages
    });
  }

  async send(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const message = await complaintChatService.sendMessage(req.body, req.user);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint chat message sent",
      data: message
    });
  }

  async sendVoice(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const message = await complaintChatService.sendVoiceMessage(req.body, req.user, req.file);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint voice message sent",
      data: message
    });
  }

  async translate(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const translation = await complaintChatService.translateMessage(req.body, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint chat translation generated",
      data: translation
    });
  }
}
