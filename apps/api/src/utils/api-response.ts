import type { Response } from "express";

interface SuccessPayload<T> {
  message: string;
  data?: T;
}

export const sendSuccess = <T>(res: Response, statusCode: number, payload: SuccessPayload<T>) => {
  return res.status(statusCode).json({
    success: true,
    message: payload.message,
    data: payload.data ?? null
  });
};

