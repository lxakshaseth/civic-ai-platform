import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { NotificationsService } from "./notification.service";

const notificationsService = new NotificationsService();

const extractComplaintId = (notification: {
  complaintId?: string | null;
  data?: unknown;
}) => {
  if (notification.complaintId) {
    return notification.complaintId;
  }

  if (
    notification.data &&
    typeof notification.data === "object" &&
    "complaintId" in notification.data &&
    typeof notification.data.complaintId === "string"
  ) {
    return notification.data.complaintId;
  }

  return null;
};

const presentNotification = <
  TNotification extends {
    complaintId?: string | null;
    isRead?: boolean;
    data?: unknown;
  }
>(
  notification: TNotification
) => ({
  ...notification,
  complaintId: extractComplaintId(notification),
  isRead: Boolean(notification.isRead)
});

export class NotificationsController {
  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const notifications = await notificationsService.listByUser(req.user.id, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Notifications fetched",
      data: notifications.map(presentNotification)
    });
  }

  async markRead(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const notification = await notificationsService.markAsRead(req.params.id, req.user.id);

    if (!notification) {
      throw new AppError("Notification not found", StatusCodes.NOT_FOUND, "NOTIFICATION_NOT_FOUND");
    }

    return sendSuccess(res, StatusCodes.OK, {
      message: "Notification marked as read",
      data: presentNotification(notification)
    });
  }

  async markAllRead(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const result = await notificationsService.markAllAsRead(req.user.id);

    return sendSuccess(res, StatusCodes.OK, {
      message: "All notifications marked as read",
      data: result
    });
  }

  async markReadCompat(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const notificationIds = [
      ...(req.body.id ? [req.body.id] : []),
      ...((Array.isArray(req.body.ids) ? req.body.ids : []) as string[])
    ];

    if (!notificationIds.length) {
      const result = await notificationsService.markAllAsRead(req.user.id);

      return sendSuccess(res, StatusCodes.OK, {
        message: "Notifications marked as read",
        data: result
      });
    }

    const notifications = await Promise.all(
      notificationIds.map((id) => notificationsService.markAsRead(id, req.user!.id))
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Notifications marked as read",
      data: notifications
        .filter(
          (
            notification
          ): notification is NonNullable<(typeof notifications)[number]> => notification != null
        )
        .map(presentNotification)
    });
  }

  async stats(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const stats = await notificationsService.getStats(req.user.id);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Notification stats fetched",
      data: stats
    });
  }
}
