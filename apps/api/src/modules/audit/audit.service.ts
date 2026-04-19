import { Prisma } from "@prisma/client";

import { AuditRepository } from "./audit.repository";
import type { AuditLogQuery } from "./audit.validator";

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository = new AuditRepository()) {}

  createLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.auditRepository.createLog(data);
  }

  listLogs(filters?: AuditLogQuery) {
    const normalizedFilters = {
      userId: filters?.userId ?? filters?.actorId,
      entity: filters?.entity ?? filters?.entityType,
      entityId: filters?.entityId,
      action: filters?.action,
      from: filters?.from,
      to: filters?.to,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? filters?.limit ?? 20
    };

    return this.auditRepository.listLogs(normalizedFilters).then((result) => ({
      filters: normalizedFilters,
      items: result.items,
      pagination: result.pagination
    }));
  }
}
