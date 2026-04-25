import { Prisma } from "@prisma/client";

import { AuditRepository } from "modules/audit/audit.repository";
import { auditQueue } from "queues/queue.registry";

interface AuditJobPayload {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const auditRepository = new AuditRepository();

const createAuditLogImmediately = (payload: AuditJobPayload) =>
  auditRepository.createLog({
    userId: payload.userId,
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    metadata: payload.metadata as Prisma.InputJsonValue | undefined
  });

export const queueAuditLogJob = async (payload: AuditJobPayload) => {
  try {
    return await auditQueue.add("audit:create", payload);
  } catch {
    return createAuditLogImmediately(payload);
  }
};
