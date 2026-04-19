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

export const queueAuditLogJob = (payload: AuditJobPayload) =>
  auditQueue.add("audit:create", payload);

