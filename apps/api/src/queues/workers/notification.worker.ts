import { NotificationType } from "@prisma/client";
import { Worker } from "bullmq";

import { env } from "config/env";
import { QUEUE_NAMES } from "constants/queue-names";
import { SOCKET_EVENTS } from "constants/socket-events";
import { NotificationsRepository } from "modules/notification/notification.repository";
import { bullMqConnection } from "queues/connection";
import { emitToUserRoom } from "sockets/socket.server";

const notificationsRepository = new NotificationsRepository();

export const createNotificationWorker = () =>
  new Worker(
    QUEUE_NAMES.notifications,
    async (job) => {
      const notification = await notificationsRepository.createNotification({
        userId: job.data.userId,
        complaintId: job.data.complaintId,
        type: (job.data.type as NotificationType) ?? NotificationType.SYSTEM,
        title: job.data.title,
        message: job.data.message,
        data: job.data.data
      });

      emitToUserRoom(notification.userId, SOCKET_EVENTS.notificationCreated, notification);
      return notification;
    },
    {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX
    }
  );
