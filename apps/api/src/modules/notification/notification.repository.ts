import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "database/clients/prisma";

export interface NotificationRecord {
  id: string;
  userId: string;
  complaintId: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export class NotificationsRepository {
  async createNotification(data: {
    userId: string;
    complaintId?: string;
    type: NotificationType | string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        complaintId: data.complaintId ?? null,
        type: data.type as NotificationType,
        title: data.title.trim(),
        message: data.message.trim(),
        data: (data.data as Prisma.InputJsonValue | undefined) ?? undefined
      }
    });

    return {
      id: notification.id,
      userId: notification.userId,
      complaintId: notification.complaintId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: (notification.data as Record<string, unknown> | null) ?? null,
      isRead: Boolean(notification.readAt),
      createdAt: notification.createdAt.toISOString()
    };
  }

  async listByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { readAt: null } : {})
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit
    });

    return notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      complaintId: notification.complaintId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: (notification.data as Record<string, unknown> | null) ?? null,
      isRead: Boolean(notification.readAt),
      createdAt: notification.createdAt.toISOString()
    }));
  }

  async markAsRead(id: string, userId: string) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingNotification) {
      return null;
    }

    const notification = await prisma.notification.update({
      where: { id: existingNotification.id },
      data: {
        readAt: existingNotification.readAt ?? new Date()
      }
    });

    return {
      id: notification.id,
      userId: notification.userId,
      complaintId: notification.complaintId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: (notification.data as Record<string, unknown> | null) ?? null,
      isRead: Boolean(notification.readAt),
      createdAt: notification.createdAt.toISOString()
    };
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return {
      count: result.count
    };
  }

  async getStats(userId: string) {
    const [total, unread] = await Promise.all([
      prisma.notification.count({
        where: { userId }
      }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null
        }
      })
    ]);

    return {
      total,
      unread,
      read: total - unread
    };
  }
}
