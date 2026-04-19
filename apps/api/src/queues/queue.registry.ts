import { Queue } from "bullmq";

import { env } from "config/env";
import { QUEUE_NAMES } from "constants/queue-names";
import { bullMqConnection } from "queues/connection";

const defaultJobOptions = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 100,
  backoff: {
    type: "exponential" as const,
    delay: 5000
  }
};

type QueueLike = {
  add: (name: string, payload: unknown) => Promise<unknown>;
  close: () => Promise<void>;
};

const createNoopQueue = (): QueueLike => ({
  add: async () => undefined,
  close: async () => undefined
});

export const notificationQueue: QueueLike = env.DISABLE_QUEUES
  ? createNoopQueue()
  : new Queue(QUEUE_NAMES.notifications, {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX,
      defaultJobOptions
    });

export const complaintAiQueue: QueueLike = env.DISABLE_QUEUES
  ? createNoopQueue()
  : new Queue(QUEUE_NAMES.complaintAi, {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX,
      defaultJobOptions
    });

export const auditQueue: QueueLike = env.DISABLE_QUEUES
  ? createNoopQueue()
  : new Queue(QUEUE_NAMES.audit, {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX,
      defaultJobOptions
    });

export const closeQueues = async () => {
  await Promise.all([notificationQueue.close(), complaintAiQueue.close(), auditQueue.close()]);
};
