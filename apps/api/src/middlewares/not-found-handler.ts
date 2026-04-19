import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const notFoundMiddleware = (req: Request, res: Response) => {
  return res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

