import { ComplaintStatus } from "@prisma/client";

export type ComplaintWorkflowStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "verified";

export const WORKFLOW_STATUS_MAP: Record<ComplaintStatus, ComplaintWorkflowStatus> = {
  [ComplaintStatus.SUBMITTED]: "pending",
  [ComplaintStatus.UNDER_REVIEW]: "pending",
  [ComplaintStatus.ASSIGNED]: "assigned",
  [ComplaintStatus.OPEN]: "pending",
  [ComplaintStatus.IN_PROGRESS]: "in_progress",
  [ComplaintStatus.RESOLVED]: "completed",
  [ComplaintStatus.REJECTED]: "pending",
  [ComplaintStatus.REOPENED]: "in_progress",
  [ComplaintStatus.CLOSED]: "verified"
};

export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.SUBMITTED]: [ComplaintStatus.ASSIGNED, ComplaintStatus.REJECTED],
  [ComplaintStatus.UNDER_REVIEW]: [ComplaintStatus.ASSIGNED, ComplaintStatus.REJECTED],
  [ComplaintStatus.ASSIGNED]: [ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.OPEN]: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.REJECTED],
  [ComplaintStatus.IN_PROGRESS]: [ComplaintStatus.RESOLVED],
  [ComplaintStatus.RESOLVED]: [ComplaintStatus.CLOSED, ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.REJECTED]: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.REOPENED]: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS],
  [ComplaintStatus.CLOSED]: []
};

export const PENDING_COMPLAINT_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.SUBMITTED,
  ComplaintStatus.UNDER_REVIEW,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.OPEN,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.REOPENED
];

export const getWorkflowStatus = (status: ComplaintStatus): ComplaintWorkflowStatus =>
  WORKFLOW_STATUS_MAP[status];
