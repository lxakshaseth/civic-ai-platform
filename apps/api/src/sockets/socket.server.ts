import type { Server as HttpServer } from "node:http";

import { UserRole } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";

import { env } from "config/env";
import { SOCKET_EVENTS } from "constants/socket-events";
import { queryCivicPlatform } from "database/clients/civic-platform";
import { socketAuthMiddleware } from "sockets/socket.auth";

let io: SocketIOServer | null = null;

type ComplaintAccessRow = {
  citizenId: string | null;
  assignedEmployeeId: string | null;
};

const getComplaintAccess = async (complaintId: string) => {
  const result = await queryCivicPlatform<ComplaintAccessRow>(
    `
      SELECT
        citizen_id AS "citizenId",
        assigned_employee_id AS "assignedEmployeeId"
      FROM public.complaints
      WHERE id = $1
      LIMIT 1
    `,
    [complaintId]
  );

  return result.rows[0] ?? null;
};

const canAccessComplaintUpdates = async (
  complaintId: string,
  actor: {
    id: string;
    role: UserRole;
  }
) => {
  const complaint = await getComplaintAccess(complaintId);

  if (!complaint) {
    return false;
  }

  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.DEPARTMENT_ADMIN) {
    return true;
  }

  if (actor.role === UserRole.CITIZEN) {
    return complaint.citizenId === actor.id;
  }

  if (actor.role === UserRole.EMPLOYEE) {
    return complaint.assignedEmployeeId === actor.id;
  }

  return false;
};

const canAccessComplaintChat = async (
  complaintId: string,
  actor: {
    id: string;
    role: UserRole;
  }
) => {
  const complaint = await getComplaintAccess(complaintId);

  if (!complaint || !complaint.assignedEmployeeId) {
    return false;
  }

  if (actor.role === UserRole.DEPARTMENT_ADMIN || actor.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (actor.role === UserRole.CITIZEN) {
    return complaint.citizenId === actor.id;
  }

  if (actor.role === UserRole.EMPLOYEE) {
    return complaint.assignedEmployeeId === actor.id;
  }

  return false;
};

export const initSocketServer = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const user = socket.data.user;

    socket.join(`user:${user.id}`);
    socket.emit("socket:ready", { userId: user.id });

    socket.on("complaint:subscribe", async (complaintId: string) => {
      if (!(await canAccessComplaintUpdates(complaintId, user))) {
        socket.emit("complaint:subscription_error", {
          complaintId,
          message: "You do not have access to this complaint stream."
        });
        return;
      }

      socket.join(`complaint:${complaintId}`);
      socket.emit(SOCKET_EVENTS.complaintSubscribed, { complaintId });
    });

    socket.on("chat:subscribe", async (complaintId: string) => {
      if (!(await canAccessComplaintChat(complaintId, user))) {
        socket.emit("chat:subscription_error", {
          complaintId,
          message: "You do not have access to this complaint chat."
        });
        return;
      }

      socket.join(`chat:${complaintId}`);
      socket.emit(SOCKET_EVENTS.chatSubscribed, { complaintId });
    });

    socket.on(
      "chat:typing",
      async (payload: { complaintId?: string; isTyping?: boolean } = {}) => {
        const complaintId = payload.complaintId?.trim();

        if (!complaintId || !(await canAccessComplaintChat(complaintId, user))) {
          return;
        }

        socket.to(`chat:${complaintId}`).emit(SOCKET_EVENTS.chatTyping, {
          complaintId,
          userId: user.id,
          isTyping: Boolean(payload.isTyping)
        });
      }
    );
  });

  return io;
};

export const getSocketServer = () => io;

export const emitToUserRoom = (userId: string, event: string, payload: unknown) => {
  io?.to(`user:${userId}`).emit(event, payload);
};

export const emitToComplaintRoom = (complaintId: string, event: string, payload: unknown) => {
  io?.to(`complaint:${complaintId}`).emit(event, payload);
};

export const emitToChatRoom = (complaintId: string, event: string, payload: unknown) => {
  io?.to(`chat:${complaintId}`).emit(event, payload);
};
