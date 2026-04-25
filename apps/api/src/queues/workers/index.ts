import { env } from "config/env";
import { bullMqConnection } from "queues/connection";

import type { Worker } from "bullmq";

import { createAuditWorker } from "./audit.worker";
import { createComplaintAiWorker } from "./complaint-ai.worker";
import { createNotificationWorker } from "./notification.worker";

let workers: Worker[] = [];

export const startQueueWorkers = () => {
  if (env.DISABLE_QUEUES || !bullMqConnection) {
    return workers;
  }

  if (workers.length > 0) {
    return workers;
  }

  workers = [createNotificationWorker(), createComplaintAiWorker(), createAuditWorker()];
  return workers;
};

export const stopQueueWorkers = async () => {
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
};
