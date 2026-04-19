import { ComplaintStatus, UserRole } from "@prisma/client";

import { getWorkflowStatus } from "constants/complaint-workflow";
import { toPublicUploadPath } from "utils/uploads";

import type { ComplaintListRecord, ComplaintRecord } from "./complaint.repository";

type PresentableComplaint = ComplaintListRecord | ComplaintRecord;
type PresentationOptions = {
  viewerRole: UserRole;
  viewerId?: string;
};

const isComplaintDetail = (complaint: PresentableComplaint): complaint is ComplaintRecord =>
  "statusHistory" in complaint;

const PINCODE_PATTERN = /\b\d{4,10}\b/;

const extractPincode = (locationAddress?: string | null) =>
  locationAddress?.match(PINCODE_PATTERN)?.[0] ?? null;

const deriveArea = (locationAddress?: string | null, pincode?: string | null) => {
  const parts =
    locationAddress
      ?.split(",")
      .map((part) => part.trim().replace(PINCODE_PATTERN, "").trim())
      .filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return parts.slice(-2).join(", ");
  }

  if (parts[0]) {
    return parts[0];
  }

  return pincode ? `PIN ${pincode}` : null;
};

const presentUserSummary = <
  TUser extends {
    id: string;
    fullName: string;
    role: UserRole;
    departmentId: string | null;
  } | null
>(
  user: TUser
) =>
  user
    ? {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId
      }
    : null;

const getWorkStatus = (status: ComplaintStatus) => {
  switch (status) {
    case ComplaintStatus.IN_PROGRESS:
    case ComplaintStatus.REOPENED:
      return "in-progress";
    case ComplaintStatus.RESOLVED:
    case ComplaintStatus.CLOSED:
      return "resolved";
    default:
      return "pending";
  }
};

const buildAssignedEmployeeInfo = (complaint: PresentableComplaint) => {
  const latestAssignment = isComplaintDetail(complaint) ? complaint.assignments[0] : null;
  const assignedEmployee = complaint.assignedEmployee ?? latestAssignment?.employee ?? null;
  const departmentName = complaint.department?.name ?? latestAssignment?.department?.name ?? null;

  if (!assignedEmployee) {
    return null;
  }

  return {
    id: assignedEmployee.id,
    name: assignedEmployee.fullName,
    department: departmentName,
    workStatus: getWorkStatus(complaint.status)
  };
};

export const presentComplaint = <TComplaint extends PresentableComplaint>(
  complaint: TComplaint,
  options: PresentationOptions
) => {
  const internalStatus = complaint.status;
  const pincode = extractPincode(complaint.locationAddress);
  const area = deriveArea(complaint.locationAddress, pincode);
  const isCitizenViewer = options.viewerRole === UserRole.CITIZEN;
  const isComplaintOwner = isCitizenViewer && options.viewerId === complaint.citizenId;

  return {
    ...complaint,
    internalStatus,
    status: getWorkflowStatus(internalStatus),
    area,
    pincode,
    location: {
      area,
      pincode
    },
    viewerIsComplaintOwner: isComplaintOwner,
    citizenId: isCitizenViewer ? undefined : complaint.citizenId,
    citizen: isCitizenViewer ? null : presentUserSummary(complaint.citizen),
    assignedEmployee: presentUserSummary(complaint.assignedEmployee),
    assignedEmployeeInfo: buildAssignedEmployeeInfo(complaint),
    locationAddress: isCitizenViewer ? null : complaint.locationAddress,
    imagePath: toPublicUploadPath(complaint.imagePath),
    ...(isComplaintDetail(complaint)
      ? {
          assignments: complaint.assignments.map((assignment) => ({
            ...assignment,
            employee: presentUserSummary(assignment.employee),
            assignedBy: isCitizenViewer ? null : presentUserSummary(assignment.assignedBy)
          })),
          comments: complaint.comments.map((comment) => ({
            ...comment,
            user: isCitizenViewer ? null : presentUserSummary(comment.user)
          })),
          feedback: complaint.feedback
            ? {
                ...complaint.feedback,
                citizen: isCitizenViewer ? null : presentUserSummary(complaint.feedback.citizen),
                officer: isCitizenViewer ? null : presentUserSummary(complaint.feedback.officer)
              }
            : null,
          evidenceItems: complaint.evidenceItems.map((item) => ({
            ...item,
            filePath: toPublicUploadPath(item.filePath),
            uploadedBy: presentUserSummary(item.uploadedBy),
            reviewedBy: isCitizenViewer ? null : presentUserSummary(item.reviewedBy)
          })),
          statusHistory: complaint.statusHistory.map((entry) => ({
            ...entry,
            internalStatus: entry.status,
            status: getWorkflowStatus(entry.status),
            changedBy: isCitizenViewer ? null : presentUserSummary(entry.changedBy)
          })),
          timelineEntries: complaint.timelineEntries.map((entry) => ({
            ...entry,
            createdBy: isCitizenViewer ? null : presentUserSummary(entry.createdBy)
          }))
        }
      : {})
  };
};

export const presentComplaints = <TComplaint extends PresentableComplaint>(
  complaints: TComplaint[],
  options: PresentationOptions
) => complaints.map((complaint) => presentComplaint(complaint, options));
