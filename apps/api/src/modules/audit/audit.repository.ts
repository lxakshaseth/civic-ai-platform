import { Prisma } from "@prisma/client";

import { prisma } from "database/clients/prisma";

export class AuditRepository {
  createLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.auditLog.create({
      data
    });
  }

  listLogs(filters?: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where = {
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.entity ? { entity: filters.entity } : {}),
      ...(filters?.entityId ? { entityId: filters.entityId } : {}),
      ...(filters?.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {})
            }
          }
        : {})
    } satisfies Prisma.AuditLogWhereInput;

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;

    return Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]).then(([items, totalItems]) => ({
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      }
    }));
  }
}
