import { NotificationType } from "@prisma/client";

import { queryCivicPlatform } from "database/clients/civic-platform";

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
    const result = await queryCivicPlatform<NotificationRecord>(
      `
        INSERT INTO public.notifications (
          user_id,
          complaint_id,
          type,
          title,
          message,
          data,
          is_read,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, false, CURRENT_TIMESTAMP)
        RETURNING
          id,
          user_id AS "userId",
          complaint_id AS "complaintId",
          type,
          title,
          message,
          data,
          is_read AS "isRead",
          created_at::text AS "createdAt"
      `,
      [
        data.userId,
        data.complaintId ?? null,
        data.type,
        data.title.trim(),
        data.message.trim(),
        data.data ? JSON.stringify(data.data) : null
      ]
    );

    return result.rows[0];
  }

  async listByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    const params: unknown[] = [userId];
    const where = [`user_id = $1`];

    if (options?.unreadOnly) {
      where.push("COALESCE(is_read, false) = false");
    }

    if (options?.limit) {
      params.push(options.limit);
    }

    const result = await queryCivicPlatform<NotificationRecord>(
      `
        SELECT
          id,
          user_id AS "userId",
          complaint_id AS "complaintId",
          type,
          title,
          message,
          data,
          COALESCE(is_read, false) AS "isRead",
          created_at::text AS "createdAt"
        FROM public.notifications
        WHERE ${where.join(" AND ")}
        ORDER BY created_at DESC NULLS LAST, id DESC
        ${options?.limit ? `LIMIT $${params.length}` : ""}
      `,
      params
    );

    return result.rows;
  }

  async markAsRead(id: string, userId: string) {
    const result = await queryCivicPlatform<NotificationRecord>(
      `
        UPDATE public.notifications
        SET is_read = true
        WHERE id = $1
          AND user_id = $2
        RETURNING
          id,
          user_id AS "userId",
          complaint_id AS "complaintId",
          type,
          title,
          message,
          data,
          COALESCE(is_read, false) AS "isRead",
          created_at::text AS "createdAt"
      `,
      [id, userId]
    );

    return result.rows[0] ?? null;
  }

  async markAllAsRead(userId: string) {
    const result = await queryCivicPlatform<{ count: string }>(
      `
        WITH updated AS (
          UPDATE public.notifications
          SET is_read = true
          WHERE user_id = $1
            AND COALESCE(is_read, false) = false
          RETURNING id
        )
        SELECT COUNT(*)::text AS count
        FROM updated
      `,
      [userId]
    );

    return {
      count: Number(result.rows[0]?.count ?? 0)
    };
  }

  async getStats(userId: string) {
    const result = await queryCivicPlatform<{
      total: string;
      unread: string;
    }>(
      `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE COALESCE(is_read, false) = false)::text AS unread
        FROM public.notifications
        WHERE user_id = $1
      `,
      [userId]
    );

    const total = Number(result.rows[0]?.total ?? 0);
    const unread = Number(result.rows[0]?.unread ?? 0);

    return {
      total,
      unread,
      read: total - unread
    };
  }
}
