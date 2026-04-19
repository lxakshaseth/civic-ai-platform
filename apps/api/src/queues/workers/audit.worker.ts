import { Worker } from "bullmq";

import { env } from "config/env";
import { QUEUE_NAMES } from "constants/queue-names";
import { AuditRepository } from "modules/audit/audit.repository";
import { bullMqConnection } from "queues/connection";

const auditRepository = new AuditRepository();

export const createAuditWorker = () =>
  new Worker(
    QUEUE_NAMES.audit,
    async (job) =>
      auditRepository.createLog({
        userId: job.data.userId,
        action: job.data.action,
        entity: job.data.entity,
        entityId: job.data.entityId,
        ipAddress: job.data.ipAddress,
        userAgent: job.data.userAgent,
        metadata: job.data.metadata
      }),
    {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX
    }
  );
