import { complaintAiQueue } from "queues/queue.registry";

export const queueComplaintAnalysisJob = (complaintId: string) =>
  complaintAiQueue.add("complaint:analyze", { complaintId });

