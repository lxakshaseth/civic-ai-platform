import { NotificationType } from "@prisma/client";

import { NotificationsRepository } from "./notification.repository";

export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository = new NotificationsRepository()
  ) {}

  listByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    return this.notificationsRepository.listByUser(userId, options);
  }

  markAsRead(id: string, userId: string) {
    return this.notificationsRepository.markAsRead(id, userId);
  }

  markAllAsRead(userId: string) {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  getStats(userId: string) {
    return this.notificationsRepository.getStats(userId);
  }

  createNotification(data: {
    userId: string;
    complaintId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    return this.notificationsRepository.createNotification(data);
  }
}
