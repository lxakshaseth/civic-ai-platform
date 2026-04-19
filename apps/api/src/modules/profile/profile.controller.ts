import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { ProfileService } from "./profile.service";

const profileService = new ProfileService();

export class ProfileController {
  async get(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const profile = await profileService.getProfile(req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Profile fetched",
      data: profile
    });
  }

  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const profile = await profileService.createProfile(req.body, req.user);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Profile saved",
      data: profile
    });
  }

  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const profile = await profileService.updateProfile(req.body, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Profile updated",
      data: profile
    });
  }
}
