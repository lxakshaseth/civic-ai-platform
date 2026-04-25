import { complaintAiQueue } from "queues/queue.registry";

export const queueComplaintAnalysisJob = async (complaintId: string) => {
  try {
    return await complaintAiQueue.add("complaint:analyze", { complaintId });
  } catch {
    return null;
  }
};
