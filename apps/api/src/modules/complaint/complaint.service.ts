import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import type { PoolClient } from "pg";

import {
  queryCivicPlatform,
  withCivicPlatformTransaction
} from "database/clients/civic-platform";
import { queueNotificationJob } from "queues/jobs/notification.job";
import { AppError } from "shared/errors/app-error";
import { departmentsMatch } from "utils/department-match";
import { calculateDistanceKm } from "utils/geo";
import { logger } from "utils/logger";
import { toPublicUploadPath } from "utils/uploads";

import {
  ComplaintsRepository,
  type ComplaintListRecord,
  type ComplaintRecord
} from "./complaint.repository";
import {
  analyzeComplaintDraft,
  buildFullAddress,
  derivePriorityFromUrgency,
  normalizeStructuredAddress,
  type ComplaintStructuredAddress
} from "./complaint-ai";

interface Actor {
  id: string;
  email: string;
  role: UserRole;
}

interface ComplaintRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

type CreateComplaintInput = {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  departmentName?: string;
  pincode?: string;
  locationAddress?: string;
  structuredAddress?: ComplaintStructuredAddress | null;
  latitude?: number;
  longitude?: number;
  departmentId?: string;
};

type CompleteComplaintInput = {
  notes: string;
  latitude?: number;
  longitude?: number;
  laborCount?: number;
  billAmount?: number;
  invoiceVendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  materialsUsed?: string;
};

type UpdateComplaintStatusInput = {
  status: string;
  note?: string;
};

type AssignComplaintInput = {
  employeeId: string;
  departmentId?: string;
  note?: string;
};

type SubmitComplaintProofInput = {
  type: "AFTER" | "INVOICE" | "BEFORE";
  note: string;
  invoiceVendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  latitude?: number;
  longitude?: number;
  markAsCompleted?: boolean;
};

type VerifyComplaintInput = {
  action: "approve" | "reject";
  note?: string;
};

type AddCommentInput = {
  comment: string;
};

type ReopenComplaintInput = {
  reason: string;
};

type ComplaintFeedbackInput = {
  rating: number;
  comment?: string;
};

type ComplaintAccessMode = "public" | "participant" | "owner";

type ComplaintRow = {
  id: string;
  title: string | null;
  description: string | null;
  issueType: string | null;
  urgencyScore: number | null;
  tags: string[] | null;
  structuredAddress: ComplaintStructuredAddress | null;
  category: string | null;
  department: string | null;
  status: string | null;
  priority: string | null;
  pincode: string | null;
  locationAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  imageUrl: string | null;
  citizenId: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeDepartment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  rejectionReason: string | null;
};

type AssignmentRow = {
  id: number;
  complaintId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  employeeDepartment: string | null;
  note: string | null;
  status: string | null;
  assignedAt: string | null;
  completedAt: string | null;
};

type ProofRow = {
  id: number;
  complaintId: string | null;
  assignmentId: number | null;
  fileUrl: string | null;
  uploadedAt: string | null;
  proofType: string | null;
  note: string | null;
  fileName: string | null;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  uploadedByRole: string | null;
};

type ComplaintWorkSummary = {
  notes: string;
  laborCount?: number | null;
  billAmount?: number | null;
  invoiceVendorName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  materialsUsed?: string | null;
};

type RatingRow = {
  id: number;
  complaintId: string | null;
  citizenId: string | null;
  rating: number | null;
  feedback: string | null;
  createdAt: string | null;
};

type CommentRow = {
  id: number;
  complaintId: string | null;
  senderId: string | null;
  senderName: string | null;
  senderRole: string | null;
  comment: string | null;
  createdAt: string | null;
};

const adminRoles = new Set<UserRole>([UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN]);

const baseComplaintSelect = `
  c.id,
  c.title,
  c.description,
  c.issue_type AS "issueType",
  c.urgency_score AS "urgencyScore",
  COALESCE(c.tags, ARRAY[]::text[]) AS tags,
  c.structured_address AS "structuredAddress",
  c.category,
  c.department,
  c.status,
  c.priority,
  c.pincode,
  c.location_address AS "locationAddress",
  c.latitude::text AS latitude,
  c.longitude::text AS longitude,
  c.image_url AS "imageUrl",
  c.citizen_id AS "citizenId",
  citizen.name AS "citizenName",
  citizen.email AS "citizenEmail",
  c.assigned_employee_id AS "assignedEmployeeId",
  employee.name AS "assignedEmployeeName",
  employee.department AS "assignedEmployeeDepartment",
  c.created_at::text AS "createdAt",
  c.updated_at::text AS "updatedAt",
  c.resolved_at::text AS "resolvedAt",
  c.closed_at::text AS "closedAt",
  c.reopened_at::text AS "reopenedAt",
  c.rejection_reason AS "rejectionReason"
`;

function normalizeInternalStatus(value?: string | null) {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "CLOSED") return "CLOSED";
  if (normalized === "RESOLVED") return "RESOLVED";
  if (normalized === "IN_PROGRESS") return "IN_PROGRESS";
  if (normalized === "REOPENED") return "REOPENED";
  if (normalized === "ASSIGNED") return "ASSIGNED";
  return "OPEN";
}

function normalizePriority(value?: string | null): "Low" | "Medium" | "High" {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function toFriendlyStatus(internalStatus: string) {
  if (internalStatus === "CLOSED") return "Resolved";
  if (internalStatus === "RESOLVED") return "Pending Admin Approval";
  if (internalStatus === "IN_PROGRESS") return "In Progress";
  if (internalStatus === "REOPENED") return "Reassigned";
  if (internalStatus === "ASSIGNED") return "Assigned";
  return "Submitted";
}

function toWorkStatus(internalStatus: string): "Pending" | "In Progress" | "Completed" {
  if (internalStatus === "CLOSED") return "Completed";
  if (internalStatus === "RESOLVED" || internalStatus === "IN_PROGRESS" || internalStatus === "REOPENED") {
    return "In Progress";
  }

  return "Pending";
}

function toNumber(value?: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDate(value?: string | null) {
  return value ?? new Date().toISOString();
}

function deriveArea(locationAddress?: string | null, pincode?: string | null) {
  const parts =
    locationAddress
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  if (parts[0]) {
    return parts[0];
  }

  return pincode ? `PIN ${pincode}` : "Unknown area";
}

function sanitizeTags(tags?: Array<string | null | undefined> | null) {
  return [...new Set((tags ?? []).map((tag) => tag?.trim()).filter(Boolean))] as string[];
}

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function parseWorkSummaryNote(note?: string | null): ComplaintWorkSummary | null {
  const normalizedNote = note?.trim();

  if (!normalizedNote) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(normalizedNote) as {
      kind?: string;
      notes?: unknown;
      laborCount?: unknown;
      billAmount?: unknown;
      invoiceVendorName?: unknown;
      invoiceNumber?: unknown;
      invoiceDate?: unknown;
      materialsUsed?: unknown;
    };

    if (parsedValue.kind !== "complaint_work_summary_v1") {
      throw new Error("Unsupported work summary note");
    }

    return {
      notes:
        typeof parsedValue.notes === "string" && parsedValue.notes.trim()
          ? parsedValue.notes.trim()
          : "Work completed on site.",
      laborCount:
        typeof parsedValue.laborCount === "number" && Number.isFinite(parsedValue.laborCount)
          ? parsedValue.laborCount
          : null,
      billAmount:
        typeof parsedValue.billAmount === "number" && Number.isFinite(parsedValue.billAmount)
          ? parsedValue.billAmount
          : null,
      invoiceVendorName:
        typeof parsedValue.invoiceVendorName === "string"
          ? normalizeOptionalText(parsedValue.invoiceVendorName)
          : null,
      invoiceNumber:
        typeof parsedValue.invoiceNumber === "string"
          ? normalizeOptionalText(parsedValue.invoiceNumber)
          : null,
      invoiceDate:
        typeof parsedValue.invoiceDate === "string"
          ? normalizeOptionalText(parsedValue.invoiceDate)
          : null,
      materialsUsed:
        typeof parsedValue.materialsUsed === "string"
          ? normalizeOptionalText(parsedValue.materialsUsed)
          : null
    };
  } catch {
    return {
      notes: normalizedNote
    };
  }
}

function serializeWorkSummaryNote(input: CompleteComplaintInput) {
  return JSON.stringify({
    kind: "complaint_work_summary_v1",
    notes: input.notes.trim(),
    laborCount: input.laborCount ?? null,
    billAmount: input.billAmount ?? null,
    invoiceVendorName: normalizeOptionalText(input.invoiceVendorName),
    invoiceNumber: normalizeOptionalText(input.invoiceNumber),
    invoiceDate: normalizeOptionalText(input.invoiceDate),
    materialsUsed: normalizeOptionalText(input.materialsUsed)
  });
}

function buildAssignmentCompletionNote(input: CompleteComplaintInput) {
  const details = [input.notes.trim()];

  if (input.laborCount != null) {
    details.push(`Labour used: ${input.laborCount}`);
  }

  if (input.billAmount != null) {
    details.push(`Bill amount: Rs ${input.billAmount}`);
  }

  if (normalizeOptionalText(input.invoiceVendorName)) {
    details.push(`Vendor: ${normalizeOptionalText(input.invoiceVendorName)}`);
  }

  if (normalizeOptionalText(input.invoiceNumber)) {
    details.push(`Invoice no: ${normalizeOptionalText(input.invoiceNumber)}`);
  }

  if (normalizeOptionalText(input.materialsUsed)) {
    details.push(`Materials: ${normalizeOptionalText(input.materialsUsed)}`);
  }

  return details.join(" | ");
}

function normalizeStructuredAddressRecord(
  value?: ComplaintStructuredAddress | null,
  locationAddress?: string | null,
  pincode?: string | null
) {
  const normalized = normalizeStructuredAddress(value);

  if (normalized) {
    return normalized;
  }

  const normalizedPincode = pincode?.trim() || "";
  const parts =
    locationAddress
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (!parts.length && !normalizedPincode) {
    return null;
  }

  return normalizeStructuredAddress({
    houseNo: parts[0] ?? "",
    street: parts[1] ?? "",
    landmark: parts.length > 4 ? parts[2] : "",
    area: parts.length > 3 ? parts[parts.length - 3] : parts[2] ?? parts[0] ?? "",
    city: parts.length > 1 ? parts[parts.length - 2] : "",
    pincode: normalizedPincode || parts[parts.length - 1] || ""
  });
}

function buildProofItems(proofs: ProofRow[]) {
  const afterImages = proofs.filter((proof) => (proof.proofType ?? "AFTER").toUpperCase() === "AFTER");
  const documents = proofs.filter((proof) => (proof.proofType ?? "").toUpperCase() === "INVOICE");
  const workSummary =
    afterImages
      .map((proof) => parseWorkSummaryNote(proof.note))
      .find((summary): summary is ComplaintWorkSummary => Boolean(summary)) ??
    documents
      .map((proof) => parseWorkSummaryNote(proof.note))
      .find((summary): summary is ComplaintWorkSummary => Boolean(summary)) ??
    null;
  const notes = workSummary?.notes ?? "";

  const mapItem = (proof: ProofRow) => ({
    id: String(proof.id),
    url: toPublicUploadPath(proof.fileUrl),
    label: (proof.proofType ?? "AFTER").toUpperCase() === "INVOICE" ? "Invoice document" : "Work proof",
    kind: (proof.mimeType ?? "").toLowerCase().startsWith("image/") ? "image" : "document",
    type: (proof.proofType ?? "AFTER").toUpperCase(),
    uploadedAt: safeDate(proof.uploadedAt),
    note: parseWorkSummaryNote(proof.note)?.notes ?? proof.note ?? undefined,
    mimeType: proof.mimeType ?? null,
    verificationStatus: null,
    uploadedByName: proof.uploadedByName ?? null
  });

  return {
    beforeImages: [] as string[],
    afterImages: afterImages.map((proof) => toPublicUploadPath(proof.fileUrl)).filter(Boolean),
    notes,
    invoice: documents[0] ? toPublicUploadPath(documents[0].fileUrl) : undefined,
    submittedAt: safeDate((afterImages[0] ?? documents[0])?.uploadedAt),
    workSummary,
    items: [...afterImages, ...documents].map(mapItem),
    documents: documents.map(mapItem)
  };
}

function buildCommentDto(comment: CommentRow) {
  return {
    id: comment.id,
    complaintId: comment.complaintId,
    comment: comment.comment ?? "",
    createdAt: safeDate(comment.createdAt),
    user: {
      id: comment.senderId,
      fullName: comment.senderName ?? "User",
      role: comment.senderRole ?? UserRole.CITIZEN
    }
  };
}

async function getAdminRecipientIds(department?: string | null) {
  const result = await queryCivicPlatform<{ id: string }>(
    `
      SELECT id
      FROM public.users
      WHERE UPPER(COALESCE(role, '')) IN ('ADMIN', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN')
        AND (
          $1::text IS NULL
          OR COALESCE(department, '') = ''
          OR LOWER(COALESCE(department, '')) = LOWER($1)
          OR UPPER(COALESCE(role, '')) = 'SUPER_ADMIN'
        )
    `,
    [department?.trim() || null]
  );

  return result.rows.map((row) => row.id);
}

async function getUserSummary(userId: string) {
  const result = await queryCivicPlatform<{
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    department: string | null;
    pincode: string | null;
    status: string | null;
  }>(
    `
      SELECT id, name, email, role, department, pincode, status
      FROM public.users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export class ComplaintsService {
  constructor(
    private readonly complaintsRepository: ComplaintsRepository = new ComplaintsRepository()
  ) {}

  analyzeComplaintDraft(input: Pick<CreateComplaintInput, "title" | "description">) {
    return analyzeComplaintDraft({
      title: input.title,
      description: input.description
    });
  }

  async createComplaint(
    data: CreateComplaintInput,
    citizenId: string,
    files: Express.Multer.File[] = [],
    _requestContext?: ComplaintRequestContext
  ) {
    if (!files.length) {
      throw new AppError(
        "At least one complaint image is required",
        StatusCodes.BAD_REQUEST,
        "COMPLAINT_IMAGE_REQUIRED"
      );
    }

    const analysis = this.analyzeComplaintDraft({
      title: data.title,
      description: data.description
    });
    const structuredAddress = normalizeStructuredAddress(data.structuredAddress);
    const fullAddress = (data.locationAddress?.trim() || buildFullAddress(structuredAddress)).trim();
    const pincode =
      data.pincode?.trim() ||
      structuredAddress?.pincode ||
      fullAddress.match(/\b\d{6}\b/)?.[0] ||
      null;
    const category = data.category?.trim() || analysis.category;
    const department = data.departmentName?.trim() || analysis.department;
    const priority = normalizePriority(data.priority ?? derivePriorityFromUrgency(analysis.urgency));

    const created = await queryCivicPlatform<{ id: string }>(
      `
        INSERT INTO public.complaints (
          title,
          description,
          issue_type,
          urgency_score,
          tags,
          structured_address,
          category,
          department,
          citizen_id,
          priority,
          pincode,
          location_address,
          latitude,
          longitude,
          image_url,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          'OPEN',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `,
      [
        data.title.trim(),
        data.description.trim(),
        analysis.issueType,
        analysis.urgency,
        analysis.suggestions.tags,
        structuredAddress ? JSON.stringify(structuredAddress) : null,
        category,
        department,
        citizenId,
        priority,
        pincode,
        fullAddress || null,
        data.latitude ?? null,
        data.longitude ?? null,
        files[0]?.path.replace(/\\/g, "/") ?? null
      ]
    );

    return this.getComplaintDtoOrThrow(created.rows[0].id, {
      id: citizenId,
      email: "",
      role: UserRole.CITIZEN
    });
  }

  listComplaints(
    actor: Actor,
    filters: {
      status?: string;
      departmentId?: string;
      assignedEmployeeId?: string;
      citizenId?: string;
      pincode?: string;
      mine?: boolean;
      category?: string;
      priority?: string;
      isSuspicious?: boolean;
      search?: string;
    }
  ) {
    return this.fetchComplaintDtos(actor, filters);
  }

  async listAdminIssues(
    actor: Actor,
    filters: {
      status?: string;
      departmentId?: string;
      assignedEmployeeId?: string;
      citizenId?: string;
      category?: string;
      priority?: string;
      isSuspicious?: boolean;
      search?: string;
    }
  ) {
    this.assertAdmin(actor.role);
    return this.fetchComplaintDtos(actor, filters);
  }

  async listEmployeeTasks(
    actor: Actor,
    filters: {
      status?: string;
      category?: string;
      priority?: string;
      search?: string;
    }
  ) {
    if (actor.role !== UserRole.EMPLOYEE) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    return this.fetchComplaintDtos(actor, {
      ...filters,
      assignedEmployeeId: actor.id
    });
  }

  async listNearbyComplaints(
    actor: Actor,
    filters: {
      lat: number;
      lng: number;
      radiusKm?: number;
      limit?: number;
    }
  ) {
    if (actor.role !== UserRole.EMPLOYEE && !adminRoles.has(actor.role)) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const complaints = await this.fetchComplaintDtos(actor, {});

    return complaints
      .map((complaint) => ({
        complaint,
        distanceKm: calculateDistanceKm(
          {
            latitude: filters.lat,
            longitude: filters.lng
          },
          {
            latitude: complaint.lat,
            longitude: complaint.lng
          }
        )
      }))
      .filter(
        (
          item
        ): item is {
          complaint: Awaited<ReturnType<ComplaintsService["fetchComplaintDtos"]>>[number];
          distanceKm: number;
        } => item.distanceKm != null && item.distanceKm <= (filters.radiusKm ?? 5)
      )
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, filters.limit ?? 50);
  }

  async getById(id: string, actor: Actor) {
    const complaint = await this.getComplaintDtoOrThrow(id, actor);
    this.ensureComplaintAccess(complaint, actor, "participant");
    return complaint;
  }

  async getByIdForViewer(id: string, actor: Actor) {
    const complaint = await this.getComplaintDtoOrThrow(id, actor);
    this.ensureComplaintAccess(complaint, actor, "public");
    return complaint;
  }

  async updateStatus(
    id: string,
    data: UpdateComplaintStatusInput,
    actor: Actor,
    _requestContext?: ComplaintRequestContext
  ) {
    const complaint = await this.getById(id, actor);
    const nextStatus = normalizeInternalStatus(data.status);
    const nextRejectionReason =
      nextStatus === "REOPENED"
        ? data.note?.trim() || complaint.rejectionReason || null
        : null;

    if (actor.role === UserRole.EMPLOYEE && complaint.assignedTo !== actor.id) {
      throw new AppError(
        "Employees can update only their assigned complaints",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    await queryCivicPlatform(
      `
        UPDATE public.complaints
        SET
          status = '${nextStatus}',
          rejection_reason = $2,
          resolved_at = CASE WHEN '${nextStatus}' = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          closed_at = CASE WHEN '${nextStatus}' = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE NULL END,
          reopened_at = CASE WHEN '${nextStatus}' = 'REOPENED' THEN CURRENT_TIMESTAMP ELSE reopened_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [id, nextRejectionReason]
    );

    const updatedComplaint = await this.getComplaintDtoOrThrow(id, actor);

    if (updatedComplaint.createdByUserId && updatedComplaint.createdByUserId !== actor.id) {
      try {
        await queueNotificationJob({
          userId: updatedComplaint.createdByUserId,
          complaintId: updatedComplaint.id,
          // Keep the notification type broadly compatible with older civic-platform schemas.
          type: "COMPLAINT_STATUS",
          title: nextStatus === "CLOSED" ? "Complaint approved" : "Complaint updated",
          message:
            nextStatus === "CLOSED"
              ? `Complaint ${updatedComplaint.id} has been approved and closed.`
              : `Complaint ${updatedComplaint.id} is now ${updatedComplaint.status}.`
        });
      } catch (error) {
        logger.warn(
          {
            err: error,
            complaintId: updatedComplaint.id,
            userId: updatedComplaint.createdByUserId,
            nextStatus
          },
          "Complaint status was updated, but citizen notification could not be created"
        );
      }
    }

    return updatedComplaint;
  }

  async assignComplaint(
    id: string,
    data: AssignComplaintInput,
    actor: Actor,
    _requestContext?: ComplaintRequestContext
  ) {
    this.assertAdmin(actor.role);

    const complaint = await this.getComplaintDtoOrThrow(id, actor);
    const employee = await getUserSummary(data.employeeId);

    if (!employee || (employee.role ?? "").toUpperCase() !== "EMPLOYEE") {
      throw new AppError("Assigned employee not found", StatusCodes.NOT_FOUND, "EMPLOYEE_NOT_FOUND");
    }

    if (
      complaint.department?.trim() &&
      (!employee.department?.trim() || !departmentsMatch(complaint.department, employee.department))
    ) {
      throw new AppError(
        "Selected employee does not belong to the complaint department",
        StatusCodes.BAD_REQUEST,
        "EMPLOYEE_DEPARTMENT_MISMATCH"
      );
    }

    await withCivicPlatformTransaction(async (client) => {
      await client.query(
        `
          UPDATE public.complaints
          SET
            assigned_employee_id = $2,
            department = COALESCE($3, department),
            status = 'ASSIGNED',
            rejection_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [id, data.employeeId, data.departmentId ?? employee.department ?? complaint.department]
      );

      await client.query(
        `
          INSERT INTO public.assignments (
            complaint_id,
            employee_uuid,
            assigned_by_uuid,
            status,
            note,
            assigned_at
          )
          VALUES ($1, $2, $3, 'ASSIGNED', $4, CURRENT_TIMESTAMP)
        `,
        [id, data.employeeId, actor.id, data.note?.trim() || null]
      );
    });

    const updatedComplaint = await this.getComplaintDtoOrThrow(id, actor);

    if (updatedComplaint.assignedTo) {
      await queueNotificationJob({
        userId: updatedComplaint.assignedTo,
        complaintId: updatedComplaint.id,
        type: "ASSIGNMENT",
        title: "Complaint assigned",
        message: `Complaint ${updatedComplaint.id} has been assigned to you.`
      });
    }

    if (updatedComplaint.createdByUserId) {
      await queueNotificationJob({
        userId: updatedComplaint.createdByUserId,
        complaintId: updatedComplaint.id,
        type: "ASSIGNMENT",
        title: "Complaint assigned",
        message: `Complaint ${updatedComplaint.id} has been assigned to the field team.`
      });
    }

    return updatedComplaint;
  }

  async completeComplaint(
    id: string,
    data: CompleteComplaintInput,
    actor: Actor,
    proofImages: Express.Multer.File[] = [],
    invoiceFile?: Express.Multer.File,
    _requestContext?: ComplaintRequestContext
  ) {
    const complaint = await this.getById(id, actor);

    if (actor.role !== UserRole.EMPLOYEE || complaint.assignedTo !== actor.id) {
      throw new AppError(
        "Only the assigned employee can complete this complaint",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    if (!proofImages.length) {
      throw new AppError(
        "At least one completion proof image is required",
        StatusCodes.BAD_REQUEST,
        "PROOF_IMAGE_REQUIRED"
      );
    }

    const latestAssignmentId = await this.getLatestAssignmentId(id, actor.id);
    const workSummaryNote = serializeWorkSummaryNote(data);
    const assignmentNote = buildAssignmentCompletionNote(data);

    await withCivicPlatformTransaction(async (client) => {
      for (const proofImage of proofImages) {
        await this.insertProof(client, {
          assignmentId: latestAssignmentId,
          fileUrl: proofImage.path.replace(/\\/g, "/"),
          fileName: proofImage.originalname,
          mimeType: proofImage.mimetype,
          note: workSummaryNote,
          uploadedBy: actor.id,
          proofType: "AFTER"
        });
      }

      if (invoiceFile) {
        await this.insertProof(client, {
          assignmentId: latestAssignmentId,
          fileUrl: invoiceFile.path.replace(/\\/g, "/"),
          fileName: invoiceFile.originalname,
          mimeType: invoiceFile.mimetype,
          note: workSummaryNote,
          uploadedBy: actor.id,
          proofType: "INVOICE"
        });
      }

      await client.query(
        `
          UPDATE public.assignments
          SET
            status = 'COMPLETED',
            note = $2,
            proof = $3,
            completed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [latestAssignmentId, assignmentNote, proofImages[0]?.path.replace(/\\/g, "/") ?? null]
      );

      await client.query(
        `
          UPDATE public.complaints
          SET
            status = 'RESOLVED',
            resolved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            rejection_reason = NULL
          WHERE id = $1
        `,
        [id]
      );
    });

    const updatedComplaint = await this.getComplaintDtoOrThrow(id, actor);
    const adminRecipients = await getAdminRecipientIds(updatedComplaint.department);

    await Promise.all(
      adminRecipients.map((userId) =>
        queueNotificationJob({
          userId,
          complaintId: updatedComplaint.id,
          type: "EVIDENCE",
          title: "Employee submitted proof",
          message: `Complaint ${updatedComplaint.id} is ready for admin approval.`
        })
      )
    );

    return {
      complaint: updatedComplaint,
      evidence: updatedComplaint.proof?.items ?? []
    };
  }

  async submitProof(
    id: string,
    data: SubmitComplaintProofInput,
    actor: Actor,
    file?: Express.Multer.File,
    _requestContext?: ComplaintRequestContext
  ) {
    if (!file) {
      throw new AppError("Evidence file is required", StatusCodes.BAD_REQUEST, "FILE_REQUIRED");
    }

    const complaint = await this.getById(id, actor);

    if (actor.role !== UserRole.EMPLOYEE || complaint.assignedTo !== actor.id) {
      throw new AppError(
        "Only the assigned employee can submit work proof",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    const latestAssignmentId = await this.getLatestAssignmentId(id, actor.id);

    await withCivicPlatformTransaction(async (client) => {
      await this.insertProof(client, {
        assignmentId: latestAssignmentId,
        fileUrl: file.path.replace(/\\/g, "/"),
        fileName: file.originalname,
        mimeType: file.mimetype,
        note: data.note,
        uploadedBy: actor.id,
        proofType: data.type
      });

      await client.query(
        `
          UPDATE public.assignments
          SET
            note = $2,
            proof = $3,
            status = CASE WHEN $4::boolean THEN 'COMPLETED' ELSE status END,
            completed_at = CASE WHEN $4::boolean THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = $1
        `,
        [latestAssignmentId, data.note.trim(), file.path.replace(/\\/g, "/"), data.markAsCompleted !== false]
      );

      await client.query(
        `
          UPDATE public.complaints
          SET
            status = CASE WHEN $2::boolean THEN 'RESOLVED' ELSE 'IN_PROGRESS' END,
            resolved_at = CASE WHEN $2::boolean THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [id, data.markAsCompleted !== false]
      );
    });

    const updatedComplaint = await this.getComplaintDtoOrThrow(id, actor);

    return {
      complaint: updatedComplaint,
      evidence: updatedComplaint.proof?.items ?? []
    };
  }

  async verifyComplaint(
    id: string,
    data: VerifyComplaintInput,
    actor: Actor,
    requestContext?: ComplaintRequestContext
  ) {
    this.assertAdmin(actor.role);

    const complaint = await this.getComplaintDtoOrThrow(id, actor);

    if (complaint.internalStatus !== "RESOLVED") {
      throw new AppError(
        "Only completed complaints can be verified by admin",
        StatusCodes.BAD_REQUEST,
        "INVALID_VERIFICATION_STATE"
      );
    }

    return this.updateStatus(
      id,
      {
        status: data.action === "approve" ? "CLOSED" : "REOPENED",
        note:
          data.note ??
          (data.action === "approve"
            ? "Admin verified the submitted proof"
            : "Admin rejected the submitted proof and requested rework")
      },
      actor,
      requestContext
    );
  }

  async getTimeline(id: string, actor: Actor) {
    const complaint = await this.getById(id, actor);
    return [
      {
        id: `${complaint.id}-created`,
        title: "Complaint submitted",
        createdAt: complaint.createdAt
      },
      ...(complaint.assignedTo
        ? [
            {
              id: `${complaint.id}-assigned`,
              title: "Complaint assigned",
              createdAt: complaint.createdAt
            }
          ]
        : []),
      ...(complaint.proof?.submittedAt
        ? [
            {
              id: `${complaint.id}-proof`,
              title: "Proof submitted",
              createdAt: complaint.proof.submittedAt
            }
          ]
        : []),
      ...(complaint.resolvedAt
        ? [
            {
              id: `${complaint.id}-resolved`,
              title: "Complaint approved",
              createdAt: complaint.resolvedAt
            }
          ]
        : [])
    ];
  }

  async addComment(id: string, data: AddCommentInput, actor: Actor) {
    const complaint = await this.getById(id, actor);

    const result = await queryCivicPlatform<{ id: number }>(
      `
        INSERT INTO public.comments (
          complaint_id,
          sender_id,
          comment,
          created_at
        )
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `,
      [id, actor.id, data.comment.trim()]
    );

    const comments = await this.listComments(id, actor);
    const createdComment = comments.find((comment) => comment.id === result.rows[0].id);

    if (!createdComment) {
      throw new AppError("Comment not found", StatusCodes.NOT_FOUND, "COMMENT_NOT_FOUND");
    }

    if (complaint.createdByUserId && complaint.createdByUserId !== actor.id) {
      await queueNotificationJob({
        userId: complaint.createdByUserId,
        complaintId: id,
        type: "SYSTEM",
        title: "New complaint comment",
        message: `A new comment was added to complaint ${id}.`
      });
    }

    return createdComment;
  }

  async listComments(id: string, actor: Actor) {
    await this.getById(id, actor);

    const result = await queryCivicPlatform<CommentRow>(
      `
        SELECT
          c.id,
          c.complaint_id AS "complaintId",
          c.sender_id AS "senderId",
          u.name AS "senderName",
          u.role AS "senderRole",
          c.comment,
          c.created_at::text AS "createdAt"
        FROM public.comments c
        LEFT JOIN public.users u
          ON u.id = c.sender_id
        WHERE c.complaint_id = $1
          AND c.receiver_id IS NULL
        ORDER BY c.created_at ASC, c.id ASC
      `,
      [id]
    );

    return result.rows.map(buildCommentDto);
  }

  async reopenComplaint(
    id: string,
    data: ReopenComplaintInput,
    actor: Actor,
    _requestContext?: ComplaintRequestContext
  ) {
    const complaint = await this.getComplaintDtoOrThrow(id, actor);

    if (actor.role !== UserRole.CITIZEN || complaint.createdByUserId !== actor.id) {
      throw new AppError(
        "Only the complaint owner can reopen the complaint",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    return this.updateStatus(
      id,
      {
        status: "REOPENED",
        note: data.reason
      },
      actor
    );
  }

  async submitFeedback(
    id: string,
    data: ComplaintFeedbackInput,
    actor: Actor,
    _requestContext?: ComplaintRequestContext
  ) {
    const complaint = await this.getComplaintDtoOrThrow(id, actor);

    if (actor.role !== UserRole.CITIZEN || complaint.createdByUserId !== actor.id) {
      throw new AppError(
        "Only the complaint owner can submit feedback",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    const existingFeedback = await queryCivicPlatform<{ id: number }>(
      `
        SELECT id
        FROM public.ratings
        WHERE complaint_id = $1
          AND citizen_uuid = $2
        LIMIT 1
      `,
      [id, actor.id]
    );

    if (existingFeedback.rows[0]) {
      throw new AppError(
        "Feedback has already been submitted for this complaint",
        StatusCodes.CONFLICT,
        "FEEDBACK_EXISTS"
      );
    }

    const created = await queryCivicPlatform<{
      id: number;
      rating: number;
      feedback: string | null;
      createdAt: string | null;
    }>(
      `
        INSERT INTO public.ratings (
          complaint_id,
          citizen_uuid,
          rating,
          feedback,
          created_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING
          id,
          rating,
          feedback,
          created_at::text AS "createdAt"
      `,
      [id, actor.id, data.rating, data.comment?.trim() || null]
    );

    return created.rows[0];
  }

  private async fetchComplaintDtos(
    actor: Actor,
    filters: {
      status?: string;
      departmentId?: string;
      assignedEmployeeId?: string;
      citizenId?: string;
      pincode?: string;
      mine?: boolean;
      category?: string;
      priority?: string;
      search?: string;
    }
  ) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (actor.role === UserRole.EMPLOYEE) {
      params.push(actor.id);
      where.push(`c.assigned_employee_id = $${params.length}`);
    } else if (actor.role === UserRole.CITIZEN && filters.mine) {
      params.push(actor.id);
      where.push(`c.citizen_id = $${params.length}`);
    }

    if (filters.status) {
      params.push(normalizeInternalStatus(filters.status));
      where.push(`UPPER(COALESCE(c.status, 'OPEN')) = $${params.length}`);
    }

    if (filters.assignedEmployeeId) {
      params.push(filters.assignedEmployeeId);
      where.push(`c.assigned_employee_id = $${params.length}`);
    }

    if (filters.citizenId && actor.role !== UserRole.CITIZEN) {
      params.push(filters.citizenId);
      where.push(`c.citizen_id = $${params.length}`);
    }

    if (filters.category?.trim()) {
      params.push(filters.category.trim());
      where.push(`LOWER(COALESCE(c.category, '')) = LOWER($${params.length})`);
    }

    if (filters.priority?.trim()) {
      params.push(filters.priority.trim());
      where.push(`LOWER(COALESCE(c.priority, '')) = LOWER($${params.length})`);
    }

    if (filters.pincode?.trim()) {
      params.push(filters.pincode.trim());
      where.push(`COALESCE(c.pincode, '') ILIKE $${params.length}`);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      where.push(`
        (
          COALESCE(c.title, '') ILIKE $${params.length}
          OR COALESCE(c.description, '') ILIKE $${params.length}
          OR COALESCE(c.issue_type, '') ILIKE $${params.length}
          OR COALESCE(array_to_string(c.tags, ' '), '') ILIKE $${params.length}
          OR COALESCE(c.location_address, '') ILIKE $${params.length}
          OR COALESCE(c.department, '') ILIKE $${params.length}
        )
      `);
    }

    try {
      const result = await queryCivicPlatform<ComplaintRow>(
        `
          SELECT ${baseComplaintSelect}
          FROM public.complaints c
          LEFT JOIN public.users citizen
            ON citizen.id = c.citizen_id
          LEFT JOIN public.users employee
            ON employee.id = c.assigned_employee_id
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY c.created_at DESC NULLS LAST, c.id DESC
        `,
        params
      );

      return this.mapComplaintRows(result.rows, actor);
    } catch (error) {
      logger.warn(
        {
          error,
          actorId: actor.id,
          actorRole: actor.role
        },
        "Legacy complaint query failed. Falling back to Prisma complaint reads."
      );

      const complaints = await this.complaintsRepository.listMany(
        this.buildPrismaComplaintWhere(actor, filters)
      );
      return complaints.map((complaint) => this.mapPrismaComplaintListRecord(complaint, actor));
    }
  }

  private async getComplaintDtoOrThrow(id: string, actor: Actor) {
    try {
      const result = await queryCivicPlatform<ComplaintRow>(
        `
          SELECT ${baseComplaintSelect}
          FROM public.complaints c
          LEFT JOIN public.users citizen
            ON citizen.id = c.citizen_id
          LEFT JOIN public.users employee
            ON employee.id = c.assigned_employee_id
          WHERE c.id = $1
          LIMIT 1
        `,
        [id]
      );

      if (!result.rows[0]) {
        throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
      }

      const complaints = await this.mapComplaintRows([result.rows[0]], actor);
      return complaints[0];
    } catch (error) {
      logger.warn(
        {
          error,
          complaintId: id,
          actorId: actor.id
        },
        "Legacy complaint detail query failed. Falling back to Prisma complaint detail."
      );

      const complaint = await this.complaintsRepository.findById(id);

      if (!complaint) {
        throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
      }

      return this.mapPrismaComplaintRecord(complaint, actor);
    }
  }

  private buildPrismaComplaintWhere(
    actor: Actor,
    filters: {
      status?: string;
      departmentId?: string;
      assignedEmployeeId?: string;
      citizenId?: string;
      pincode?: string;
      mine?: boolean;
      category?: string;
      priority?: string;
      search?: string;
    }
  ) {
    const where: Record<string, unknown> = {};

    if (actor.role === UserRole.EMPLOYEE) {
      where.assignedEmployeeId = actor.id;
    } else if (actor.role === UserRole.CITIZEN && filters.mine) {
      where.citizenId = actor.id;
    }

    if (filters.status?.trim()) {
      where.status = normalizeInternalStatus(filters.status);
    }

    if (filters.assignedEmployeeId) {
      where.assignedEmployeeId = filters.assignedEmployeeId;
    }

    if (filters.citizenId && actor.role !== UserRole.CITIZEN) {
      where.citizenId = filters.citizenId;
    }

    if (filters.category?.trim()) {
      where.category = filters.category.trim();
    }

    if (filters.priority?.trim()) {
      where.priority = filters.priority.trim().toUpperCase();
    }

    if (filters.departmentId?.trim()) {
      where.departmentId = filters.departmentId.trim();
    }

    if (filters.search?.trim()) {
      where.OR = [
        { title: { contains: filters.search.trim(), mode: "insensitive" } },
        { description: { contains: filters.search.trim(), mode: "insensitive" } },
        { category: { contains: filters.search.trim(), mode: "insensitive" } },
        { locationAddress: { contains: filters.search.trim(), mode: "insensitive" } }
      ];
    }

    return where;
  }

  private mapPrismaComplaintListRecord(complaint: ComplaintListRecord, actor: Actor) {
    const internalStatus = normalizeInternalStatus(complaint.status);
    const beforeImage = complaint.imagePath ? toPublicUploadPath(complaint.imagePath) : "";
    const isOwner = complaint.citizenId === actor.id;

    return {
      id: complaint.id,
      title: complaint.title?.trim() || "Untitled complaint",
      issueType: complaint.category?.trim() || complaint.aiCategory?.trim() || "General civic issue",
      urgencyScore: complaint.aiConfidence ? Math.round(complaint.aiConfidence * 100) : 68,
      tags: sanitizeTags([complaint.category, complaint.department?.name]),
      structuredAddress: null,
      category: complaint.category?.trim() || "Other",
      department: complaint.department?.name?.trim() || "Unassigned",
      area: deriveArea(complaint.locationAddress, null),
      address: complaint.locationAddress?.trim() || "Location unavailable",
      pincode: "",
      status: toFriendlyStatus(internalStatus),
      internalStatus,
      priority: normalizePriority(complaint.priority),
      createdAt: complaint.createdAt.toISOString(),
      submittedAt: complaint.createdAt.toISOString().slice(0, 10),
      resolvedAt: complaint.closedAt?.toISOString() ?? complaint.resolvedAt?.toISOString() ?? undefined,
      sentimentScore: 78,
      aiUrgency: complaint.aiConfidence ? Math.round(complaint.aiConfidence * 100) : 68,
      rating: complaint.feedback?.rating ?? undefined,
      feedbackComment: complaint.feedback?.comment ?? null,
      citizen: actor.role === UserRole.CITIZEN && !isOwner ? "Citizen" : complaint.citizen.fullName,
      createdBy: actor.role === UserRole.CITIZEN && !isOwner ? "Citizen" : complaint.citizen.fullName,
      createdByUserId: complaint.citizenId,
      viewerIsComplaintOwner: isOwner,
      lat: complaint.latitude ? Number(complaint.latitude) : 0,
      lng: complaint.longitude ? Number(complaint.longitude) : 0,
      description: complaint.description?.trim() || "",
      beforeImage,
      citizenImages: beforeImage ? [beforeImage] : [],
      hasOriginalBeforeImage: Boolean(beforeImage),
      afterImage: undefined,
      assignedTo: complaint.assignedEmployeeId,
      assignedEmployeeName: complaint.assignedEmployee?.fullName ?? null,
      assignedEmployeeDepartment: complaint.assignedEmployee?.departmentId ?? null,
      assignedEmployeeInfo:
        complaint.assignedEmployeeId && complaint.assignedEmployee
          ? {
              id: complaint.assignedEmployeeId,
              name: complaint.assignedEmployee.fullName,
              department: complaint.department?.name ?? null,
              workStatus: toWorkStatus(internalStatus)
            }
          : null,
      assignedEmployeeStatus: toWorkStatus(internalStatus),
      locationSummary: deriveArea(complaint.locationAddress, null),
      proof: complaint._count.evidenceItems
        ? {
            beforeImages: beforeImage ? [beforeImage] : [],
            afterImages: [],
            notes: "",
            submittedAt: complaint.updatedAt.toISOString(),
            workSummary: null,
            items: [],
            documents: []
          }
        : null,
      rejectionReason: null,
      aiSuggestion: {
        category: complaint.category?.trim() || "Other",
        department: complaint.department?.name?.trim() || "Unassigned",
        label: `${complaint.category?.trim() || "Other"} • ${complaint.department?.name?.trim() || "Unassigned"}`
      }
    };
  }

  private mapPrismaComplaintRecord(complaint: ComplaintRecord, actor: Actor) {
    const mappedComplaint = this.mapPrismaComplaintListRecord(complaint as unknown as ComplaintListRecord, actor);
    const beforeImages = complaint.evidenceItems
      .filter((item) => item.type === "BEFORE")
      .map((item) => toPublicUploadPath(item.filePath))
      .filter(Boolean);
    const afterImages = complaint.evidenceItems
      .filter((item) => item.type === "AFTER")
      .map((item) => toPublicUploadPath(item.filePath))
      .filter(Boolean);
    const documents = complaint.evidenceItems
      .filter((item) => item.type === "INVOICE")
      .map((item) => ({
        id: item.id,
        url: toPublicUploadPath(item.filePath),
        label: item.fileName,
        kind: item.mimeType.toLowerCase().startsWith("image/") ? "image" : "document",
        type: item.type,
        uploadedAt: item.createdAt.toISOString(),
        note: item.note ?? undefined,
        mimeType: item.mimeType,
        verificationStatus: item.verificationStatus ?? null,
        uploadedByName: item.uploadedBy.fullName
      }));

    return {
      ...mappedComplaint,
      proof: complaint.evidenceItems.length
        ? {
            beforeImages,
            afterImages,
            notes: complaint.evidenceItems[0]?.note ?? "",
            invoice: documents[0]?.url,
            submittedAt: complaint.evidenceItems[0]?.createdAt.toISOString() ?? complaint.updatedAt.toISOString(),
            workSummary: null,
            items: documents,
            documents
          }
        : null,
      rejectionReason: complaint.status === "REJECTED" ? "Rejected" : null
    };
  }

  private async mapComplaintRows(rows: ComplaintRow[], actor: Actor) {
    if (!rows.length) {
      return [];
    }

    const complaintIds = rows.map((row) => row.id);

    const [assignmentsResult, proofsResult, ratingsResult] = await Promise.all([
      queryCivicPlatform<AssignmentRow>(
        `
          SELECT
            a.id,
            a.complaint_id AS "complaintId",
            a.employee_uuid AS "employeeId",
            u.name AS "employeeName",
            u.department AS "employeeDepartment",
            a.note,
            a.status,
            a.assigned_at::text AS "assignedAt",
            a.completed_at::text AS "completedAt"
          FROM public.assignments a
          LEFT JOIN public.users u
            ON u.id = a.employee_uuid
          WHERE a.complaint_id = ANY($1::uuid[])
          ORDER BY a.assigned_at DESC NULLS LAST, a.id DESC
        `,
        [complaintIds]
      ),
      queryCivicPlatform<ProofRow>(
        `
          SELECT
            p.id,
            a.complaint_id AS "complaintId",
            p.assignment_id AS "assignmentId",
            p.file_url AS "fileUrl",
            p.uploaded_at::text AS "uploadedAt",
            p.proof_type AS "proofType",
            p.note,
            p.file_name AS "fileName",
            p.mime_type AS "mimeType",
            p.uploaded_by AS "uploadedBy",
            u.name AS "uploadedByName",
            u.role AS "uploadedByRole"
          FROM public.proofs p
          INNER JOIN public.assignments a
            ON a.id = p.assignment_id
          LEFT JOIN public.users u
            ON u.id = p.uploaded_by
          WHERE a.complaint_id = ANY($1::uuid[])
          ORDER BY p.uploaded_at DESC NULLS LAST, p.id DESC
        `,
        [complaintIds]
      ),
      queryCivicPlatform<RatingRow>(
        `
          SELECT
            id,
            complaint_id AS "complaintId",
            citizen_uuid AS "citizenId",
            rating,
            feedback,
            created_at::text AS "createdAt"
          FROM public.ratings
          WHERE complaint_id = ANY($1::uuid[])
          ORDER BY created_at DESC NULLS LAST, id DESC
        `,
        [complaintIds]
      )
    ]);

    const assignmentsByComplaint = new Map<string, AssignmentRow[]>();
    const proofsByComplaint = new Map<string, ProofRow[]>();
    const ratingsByComplaint = new Map<string, RatingRow[]>();

    for (const assignment of assignmentsResult.rows) {
      if (!assignment.complaintId) continue;
      const entries = assignmentsByComplaint.get(assignment.complaintId) ?? [];
      entries.push(assignment);
      assignmentsByComplaint.set(assignment.complaintId, entries);
    }

    for (const proof of proofsResult.rows) {
      if (!proof.complaintId) continue;
      const entries = proofsByComplaint.get(proof.complaintId) ?? [];
      entries.push(proof);
      proofsByComplaint.set(proof.complaintId, entries);
    }

    for (const rating of ratingsResult.rows) {
      if (!rating.complaintId) continue;
      const entries = ratingsByComplaint.get(rating.complaintId) ?? [];
      entries.push(rating);
      ratingsByComplaint.set(rating.complaintId, entries);
    }

    return rows.map((row) => {
      const internalStatus = normalizeInternalStatus(row.status);
      const assignments = assignmentsByComplaint.get(row.id) ?? [];
      const proofs = proofsByComplaint.get(row.id) ?? [];
      const rating = (ratingsByComplaint.get(row.id) ?? [])[0];
      const latestAssignment = assignments[0];
      const proof = proofs.length ? buildProofItems(proofs) : null;
      const structuredAddress = normalizeStructuredAddressRecord(
        row.structuredAddress,
        row.locationAddress,
        row.pincode
      );
      const pincode = row.pincode?.trim() || structuredAddress?.pincode || "";
      const area = structuredAddress?.area || deriveArea(row.locationAddress, pincode);
      const address = row.locationAddress?.trim() || buildFullAddress(structuredAddress) || area;
      const urgencyScore =
        row.urgencyScore ??
        (normalizePriority(row.priority) === "High"
          ? 85
          : normalizePriority(row.priority) === "Low"
            ? 54
            : 68);
      const tags = sanitizeTags(
        row.tags?.length ? row.tags : [row.issueType, row.category, row.department]
      );
      const isCitizenViewer = actor.role === UserRole.CITIZEN;
      const isOwner = row.citizenId === actor.id;
      const createdBy = isCitizenViewer && !isOwner ? "Citizen" : row.citizenName ?? "Citizen";
      const beforeImage = toPublicUploadPath(row.imageUrl);

      return {
        id: row.id,
        title: row.title?.trim() || "Untitled complaint",
        issueType: row.issueType?.trim() || row.category?.trim() || "General civic issue",
        urgencyScore,
        tags,
        structuredAddress,
        category: row.category?.trim() || "Other",
        department: row.department?.trim() || latestAssignment?.employeeDepartment || "Unassigned",
        area,
        address,
        pincode,
        status: toFriendlyStatus(internalStatus),
        internalStatus,
        priority: normalizePriority(row.priority),
        createdAt: safeDate(row.createdAt),
        submittedAt: safeDate(row.createdAt).slice(0, 10),
        resolvedAt: row.closedAt ?? row.resolvedAt ?? undefined,
        sentimentScore: 78,
        aiUrgency: urgencyScore,
        rating: rating?.rating ?? undefined,
        feedbackComment: rating?.feedback ?? null,
        citizen: createdBy,
        createdBy,
        createdByUserId: row.citizenId,
        viewerIsComplaintOwner: isOwner,
        lat: toNumber(row.latitude),
        lng: toNumber(row.longitude),
        description: row.description?.trim() || "",
        beforeImage: beforeImage || "",
        citizenImages: beforeImage ? [beforeImage] : [],
        hasOriginalBeforeImage: Boolean(beforeImage),
        afterImage: proof?.afterImages[0],
        assignedTo: row.assignedEmployeeId,
        assignedEmployeeName: row.assignedEmployeeName ?? latestAssignment?.employeeName ?? null,
        assignedEmployeeDepartment:
          row.assignedEmployeeDepartment ?? latestAssignment?.employeeDepartment ?? null,
        assignedEmployeeInfo:
          row.assignedEmployeeId || latestAssignment?.employeeId
            ? {
                id: row.assignedEmployeeId ?? latestAssignment?.employeeId ?? null,
                name: row.assignedEmployeeName ?? latestAssignment?.employeeName ?? "Assigned employee",
                department:
                  row.assignedEmployeeDepartment ??
                  latestAssignment?.employeeDepartment ??
                  row.department ??
                  null,
                workStatus: toWorkStatus(internalStatus)
              }
            : null,
        assignedEmployeeStatus: toWorkStatus(internalStatus),
        locationSummary: [area, structuredAddress?.city, pincode].filter(Boolean).join(" | "),
        proof,
        rejectionReason: row.rejectionReason,
        aiSuggestion: {
          category: row.category?.trim() || "Other",
          department: row.department?.trim() || "Unassigned",
          label: `${row.category?.trim() || "Other"} • ${row.department?.trim() || "Unassigned"}`
        }
      };
    });
  }

  private ensureComplaintAccess(
    complaint: {
      assignedTo: string | null;
      createdByUserId: string | null;
    },
    actor: Actor,
    accessMode: ComplaintAccessMode
  ) {
    const isOwner = complaint.createdByUserId === actor.id;
    const isAssignedEmployee = complaint.assignedTo === actor.id;

    if (adminRoles.has(actor.role)) {
      return;
    }

    if (accessMode === "public" && actor.role === UserRole.CITIZEN) {
      return;
    }

    if (accessMode === "owner" && isOwner) {
      return;
    }

    if (accessMode !== "owner" && (isOwner || isAssignedEmployee)) {
      return;
    }

    throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
  }

  private assertAdmin(role: UserRole) {
    if (!adminRoles.has(role)) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private async getLatestAssignmentId(complaintId: string, employeeId: string) {
    const result = await queryCivicPlatform<{ id: number }>(
      `
        SELECT id
        FROM public.assignments
        WHERE complaint_id = $1
          AND employee_uuid = $2
        ORDER BY assigned_at DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [complaintId, employeeId]
    );

    const assignmentId = result.rows[0]?.id;

    if (!assignmentId) {
      throw new AppError(
        "No active assignment was found for this complaint",
        StatusCodes.BAD_REQUEST,
        "ASSIGNMENT_NOT_FOUND"
      );
    }

    return assignmentId;
  }

  private insertProof(
    client: PoolClient,
    input: {
      assignmentId: number;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      note: string;
      uploadedBy: string;
      proofType: string;
    }
  ) {
    return client.query(
      `
        INSERT INTO public.proofs (
          assignment_id,
          file_url,
          uploaded_at,
          proof_type,
          note,
          file_name,
          mime_type,
          uploaded_by
        )
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)
      `,
      [
        input.assignmentId,
        input.fileUrl,
        input.proofType,
        input.note.trim(),
        input.fileName,
        input.mimeType,
        input.uploadedBy
      ]
    );
  }
}
