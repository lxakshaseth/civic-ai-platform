import type { Socket } from "socket.io";

import { verifyAccessToken } from "utils/token";

export const socketAuthMiddleware = (socket: Socket, next: (error?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Socket authentication required"));
    }

    const payload = verifyAccessToken(token);
    socket.data.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch {
    next(new Error("Invalid socket token"));
  }
};

