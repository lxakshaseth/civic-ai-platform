import { NotificationType } from "@prisma/client";

import { env } from "config/env";
import { SOCKET_EVENTS } from "constants/socket-events";
import { NotificationsRepository } from "modules/notification/notification.repository";
import { notificationQueue } from "queues/queue.registry";
import { emitToUserRoom } from "sockets/socket.server";

interface NotificationJobPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  complaintId?: string;
  data?: Record<string, unknown>;
}

const notificationsRepository = new NotificationsRepository();

const createNotificationImmediately = async (payload: NotificationJobPayload) => {
  const notification = await notificationsRepository.createNotification({
    userId: payload.userId,
    complaintId: payload.complaintId,
    type: (payload.type as NotificationType) ?? NotificationType.SYSTEM,
    title: payload.title,
    message: payload.message,
    data: payload.data
  });

  emitToUserRoom(notification.userId, SOCKET_EVENTS.notificationCreated, notification);
  return notification;
};

export const queueNotificationJob = async (payload: NotificationJobPayload) => {
  if (env.DISABLE_QUEUES) {
    return createNotificationImmediately(payload);
  }

  try {
    return await notificationQueue.add("notification:create", payload);
  } catch {
    return createNotificationImmediately(payload);
  }
};
