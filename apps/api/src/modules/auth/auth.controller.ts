import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { env } from "config/env";
import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { AuthService } from "./auth.service";

const authService = new AuthService();

const getCookieDomain = () => {
  const normalizedDomain = env.COOKIE_DOMAIN?.trim();

  if (
    !normalizedDomain ||
    normalizedDomain === "localhost" ||
    normalizedDomain === "127.0.0.1" ||
    normalizedDomain === "::1"
  ) {
    return undefined;
  }

  return normalizedDomain;
};

const cookieDomain = getCookieDomain();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
  ...(cookieDomain ? { domain: cookieDomain } : {})
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined;
      const role = req.body?.role;

      if (!fullName || !email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "fullName, email, and password are required",
          code: "VALIDATION_ERROR",
          details: null
        });
      }

      const result = await authService.register({
        fullName,
        email,
        password,
        phone,
        role
      });
      setAuthCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, StatusCodes.OK, {
        message: "Registration successful",
        data: result
      });
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          details: error.details ?? null
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        details: null
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const role = req.body?.role;

      if (!email || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "email and password are required",
          code: "VALIDATION_ERROR",
          details: null
        });
      }

      const result = await authService.login(
        {
          email,
          password,
          role
        },
        {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]
        }
      );
      setAuthCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, StatusCodes.OK, {
        message: "Login successful",
        data: result
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
          details: error.details ?? null
        });
      }

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        details: null
      });
    }
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.body.refreshToken ?? req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", StatusCodes.BAD_REQUEST, "REFRESH_TOKEN_REQUIRED");
    }

    const result = await authService.refresh(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Token refreshed",
      data: result
    });
  }

  async logout(req: Request, res: Response) {
    const refreshToken = req.body.refreshToken ?? req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearAuthCookies(res);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Logout successful"
    });
  }

  async me(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const user = await authService.me(req.user.id);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Current user fetched",
      data: user
    });
  }
}
