import { ComplaintStatus, Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { queueNotificationJob } from "queues/jobs/notification.job";
import { AppError } from "shared/errors/app-error";
import { calculateDistanceKm } from "utils/geo";
import { logger } from "utils/logger";
import { toPublicUploadPath } from "utils/uploads";

import { EvidenceService } from "../evidence/evidence.service";
import {
  analyzeComplaintDraft,
  buildFullAddress,
  derivePriorityFromUrgency,
  normalizeStructuredAddress,
  type ComplaintStructuredAddress
} from "./complaint-ai";
import {
  ComplaintsRepository,
  type ComplaintListRecord,
  type ComplaintRecord
} from "./complaint.repository";

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

const adminRoles = new Set<UserRole>([UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN]);

function normalizeInternalStatus(value?: string | null): ComplaintStatus {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case ComplaintStatus.SUBMITTED:
      return ComplaintStatus.SUBMITTED;
    case ComplaintStatus.UNDER_REVIEW:
      return ComplaintStatus.UNDER_REVIEW;
    case ComplaintStatus.ASSIGNED:
      return ComplaintStatus.ASSIGNED;
    case ComplaintStatus.IN_PROGRESS:
      return ComplaintStatus.IN_PROGRESS;
    case ComplaintStatus.RESOLVED:
      return ComplaintStatus.RESOLVED;
    case ComplaintStatus.REJECTED:
      return ComplaintStatus.REJECTED;
    case ComplaintStatus.REOPENED:
      return ComplaintStatus.REOPENED;
    case ComplaintStatus.CLOSED:
      return ComplaintStatus.CLOSED;
    default:
      return ComplaintStatus.OPEN;
  }
}

function normalizePriority(value?: string | null): "Low" | "Medium" | "High" {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function toFriendlyStatus(internalStatus: ComplaintStatus) {
  if (internalStatus === ComplaintStatus.CLOSED) return "Resolved";
  if (internalStatus === ComplaintStatus.RESOLVED) return "Pending Admin Approval";
  if (internalStatus === ComplaintStatus.IN_PROGRESS) return "In Progress";
  if (internalStatus === ComplaintStatus.REOPENED) return "Reassigned";
  if (internalStatus === ComplaintStatus.ASSIGNED) return "Assigned";
  return "Submitted";
}

function toWorkStatus(internalStatus: ComplaintStatus): "Pending" | "In Progress" | "Completed" {
  if (internalStatus === ComplaintStatus.CLOSED) return "Completed";
  if (
    internalStatus === ComplaintStatus.RESOLVED ||
    internalStatus === ComplaintStatus.IN_PROGRESS ||
    internalStatus === ComplaintStatus.REOPENED
  ) {
    return "In Progress";
  }

  return "Pending";
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

function mapComment(comment: {
  id: string;
  complaintId: string;
  comment: string;
  createdAt: Date;
  user: { id: string; fullName: string; role: UserRole };
}) {
  return {
    id: comment.id,
    complaintId: comment.complaintId,
    comment: comment.comment,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      fullName: comment.user.fullName,
      role: comment.user.role
    }
  };
}

export class ComplaintsService {
  constructor(
    private readonly complaintsRepository: ComplaintsRepository = new ComplaintsRepository(),
    private readonly evidenceService: EvidenceService = new EvidenceService()
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
    requestContext?: ComplaintRequestContext
  ) {
    const title = data.title?.trim();
    const description = data.description?.trim();

    if (!title || title.length < 5) {
      throw new AppError("Title is required", StatusCodes.BAD_REQUEST, "INVALID_COMPLAINT_TITLE");
    }

    if (!description || description.length < 10) {
      throw new AppError(
        "Description is required",
        StatusCodes.BAD_REQUEST,
        "INVALID_COMPLAINT_DESCRIPTION"
      );
    }

    const actorProfile = await this.complaintsRepository.findActorProfile(citizenId);
    if (!actorProfile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    try {
      const analysis = this.analyzeComplaintDraft({
        title,
        description
      });
      const structuredAddress = normalizeStructuredAddress(data.structuredAddress);
      const fullAddress = (data.locationAddress?.trim() || buildFullAddress(structuredAddress)).trim();

      if (!fullAddress) {
        throw new AppError(
          "Location address is required",
          StatusCodes.BAD_REQUEST,
          "INVALID_COMPLAINT_ADDRESS"
        );
      }

      const pincode =
        data.pincode?.trim() ||
        structuredAddress?.pincode ||
        fullAddress.match(/\b\d{6}\b/)?.[0] ||
        null;
      const category = data.category?.trim() || analysis.category || "General";
      const priority = normalizePriority(data.priority ?? derivePriorityFromUrgency(analysis.urgency));
      const departmentId = await this.resolveDepartmentId(
        data.departmentId,
        data.departmentName ?? analysis.department
      );

      logger.info(
        {
          citizenId,
          contentType: requestContext ? "multipart-or-json" : undefined,
          category,
          departmentId,
          pincode,
          imageCount: files.length,
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent
        },
        "Creating complaint with Prisma"
      );

      const createdComplaint = await this.complaintsRepository.createComplaint({
        title,
        description,
        issueType: analysis.issueType || category,
        urgencyScore: Number.isFinite(analysis.urgency) ? analysis.urgency : 68,
        tags: sanitizeTags(analysis.suggestions.tags),
        structuredAddress: structuredAddress ?? undefined,
        category,
        priority: priority.toUpperCase(),
        locationAddress: fullAddress,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        departmentId,
        imagePath: files[0]?.path?.replace(/\\/g, "/") || undefined,
        citizenId: actorProfile.id,
        aiCategory: analysis.category || category,
        aiPriority: priority.toUpperCase(),
        aiConfidence: 0.8,
        duplicateScore: 0,
        fraudScore: 0,
        isSuspicious: false,
        complaintImages: files.length
          ? files.map((file, index) => ({
              uploadedById: actorProfile.id,
              fileName: file.originalname?.trim() || `complaint-image-${index + 1}`,
              filePath: file.path.replace(/\\/g, "/"),
              mimeType: file.mimetype || "application/octet-stream",
              fileSize: Number.isFinite(file.size) ? file.size : 0,
              note: index === 0 ? "Complaint submitted" : undefined
            }))
          : undefined
      });

      return {
        id: createdComplaint.id
      };
    } catch (error) {
      console.error("FULL ERROR:", error);
      logger.error(
        {
          error,
          citizenId,
          ipAddress: requestContext?.ipAddress,
          userAgent: requestContext?.userAgent
        },
        "Complaint creation failed"
      );

      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new AppError(
            "Complaint references invalid related data",
            StatusCodes.BAD_REQUEST,
            "INVALID_COMPLAINT_RELATION"
          );
        }

        if (error.code === "P2025") {
          throw new AppError(
            "Complaint references a missing user or department",
            StatusCodes.BAD_REQUEST,
            "COMPLAINT_RELATION_NOT_FOUND"
          );
        }
      }

      throw new AppError(
        "Unable to create complaint",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "COMPLAINT_CREATE_FAILED"
      );
    }
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
    const complaint = await this.complaintsRepository.findById(id);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const currentComplaint = this.mapPrismaComplaintRecord(complaint, actor);
    this.ensureComplaintAccess(currentComplaint, actor, "participant");

    if (actor.role === UserRole.EMPLOYEE && currentComplaint.assignedTo !== actor.id) {
      throw new AppError(
        "Employees can update only their assigned complaints",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    const nextStatus = normalizeInternalStatus(data.status);
    const now = new Date();
    const statusTimestamps = {
      resolvedAt: nextStatus === ComplaintStatus.RESOLVED ? now : complaint.resolvedAt,
      closedAt: nextStatus === ComplaintStatus.CLOSED ? now : complaint.closedAt,
      reopenedAt: nextStatus === ComplaintStatus.REOPENED ? now : complaint.reopenedAt,
      rejectedAt: nextStatus === ComplaintStatus.REJECTED ? now : complaint.rejectedAt
    };
    const updatedComplaint = await this.complaintsRepository.updateStatus(
      id,
      nextStatus,
      actor.id,
      data.note?.trim(),
      statusTimestamps
    );

    const mappedComplaint = this.mapPrismaComplaintRecord(updatedComplaint, actor);

    if (mappedComplaint.createdByUserId && mappedComplaint.createdByUserId !== actor.id) {
      await queueNotificationJob({
        userId: mappedComplaint.createdByUserId,
        complaintId: mappedComplaint.id,
        type: "COMPLAINT_STATUS",
        title: nextStatus === ComplaintStatus.CLOSED ? "Complaint approved" : "Complaint updated",
        message:
          nextStatus === ComplaintStatus.CLOSED
            ? `Complaint ${mappedComplaint.id} has been approved and closed.`
            : `Complaint ${mappedComplaint.id} is now ${mappedComplaint.status}.`
      }).catch((error) => {
        logger.warn({ error, complaintId: mappedComplaint.id }, "Failed to enqueue complaint status notification");
      });
    }

    return mappedComplaint;
  }

  async assignComplaint(
    id: string,
    data: AssignComplaintInput,
    actor: Actor,
    _requestContext?: ComplaintRequestContext
  ) {
    this.assertAdmin(actor.role);

    const complaint = await this.complaintsRepository.findById(id);
    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const employee = await this.complaintsRepository.findEmployeeById(data.employeeId);
    if (!employee || employee.role !== UserRole.EMPLOYEE || !employee.isActive) {
      throw new AppError("Assigned employee not found", StatusCodes.NOT_FOUND, "EMPLOYEE_NOT_FOUND");
    }

    const departmentId = data.departmentId ?? complaint.departmentId ?? employee.departmentId ?? undefined;
    if (departmentId && employee.departmentId && employee.departmentId !== departmentId) {
      throw new AppError(
        "Selected employee does not belong to the complaint department",
        StatusCodes.BAD_REQUEST,
        "EMPLOYEE_DEPARTMENT_MISMATCH"
      );
    }

    const updatedComplaint = await this.complaintsRepository.assignComplaint({
      complaintId: id,
      employeeId: data.employeeId,
      departmentId,
      assignedById: actor.id,
      note: data.note?.trim(),
      nextStatus: ComplaintStatus.ASSIGNED
    });

    const mappedComplaint = this.mapPrismaComplaintRecord(updatedComplaint, actor);

    await Promise.allSettled([
      mappedComplaint.assignedTo
        ? queueNotificationJob({
            userId: mappedComplaint.assignedTo,
            complaintId: mappedComplaint.id,
            type: "ASSIGNMENT",
            title: "Complaint assigned",
            message: `Complaint ${mappedComplaint.id} has been assigned to you.`
          })
        : Promise.resolve(),
      mappedComplaint.createdByUserId
        ? queueNotificationJob({
            userId: mappedComplaint.createdByUserId,
            complaintId: mappedComplaint.id,
            type: "ASSIGNMENT",
            title: "Complaint assigned",
            message: `Complaint ${mappedComplaint.id} has been assigned to the field team.`
          })
        : Promise.resolve()
    ]);

    return mappedComplaint;
  }

  async completeComplaint(
    id: string,
    data: CompleteComplaintInput,
    actor: Actor,
    proofImages: Express.Multer.File[] = [],
    invoiceFile?: Express.Multer.File,
    requestContext?: ComplaintRequestContext
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

    const workSummaryNote = serializeWorkSummaryNote(data);
    const assignmentNote = buildAssignmentCompletionNote(data);

    await this.complaintsRepository.updateStatus(
      id,
      ComplaintStatus.IN_PROGRESS,
      actor.id,
      "Work started"
    );

    const evidence = [];
    for (const proofImage of proofImages) {
      evidence.push(
        await this.evidenceService.createEvidence(
          id,
          {
            type: "AFTER",
            note: workSummaryNote,
            latitude: data.latitude,
            longitude: data.longitude
          },
          actor.id,
          proofImage,
          requestContext,
          { notifyCitizen: false }
        )
      );
    }

    if (invoiceFile) {
      evidence.push(
        await this.evidenceService.createEvidence(
          id,
          {
            type: "INVOICE",
            note: workSummaryNote,
            invoiceVendorName: data.invoiceVendorName,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            invoiceAmount: data.billAmount
          },
          actor.id,
          invoiceFile,
          requestContext,
          { notifyCitizen: false }
        )
      );
    }

    const updatedComplaint = await this.complaintsRepository.updateStatus(
      id,
      ComplaintStatus.RESOLVED,
      actor.id,
      assignmentNote,
      {
        resolvedAt: new Date(),
        closedAt: null,
        rejectedAt: null
      }
    );

    const adminRecipients = await this.complaintsRepository.listAdminRecipients(updatedComplaint.departmentId);
    await Promise.allSettled(
      adminRecipients.map((recipient) =>
        queueNotificationJob({
          userId: recipient.id,
          complaintId: updatedComplaint.id,
          type: "EVIDENCE",
          title: "Employee submitted proof",
          message: `Complaint ${updatedComplaint.id} is ready for admin approval.`
        })
      )
    );

    return {
      complaint: this.mapPrismaComplaintRecord(updatedComplaint, actor),
      evidence
    };
  }

  async submitProof(
    id: string,
    data: SubmitComplaintProofInput,
    actor: Actor,
    file?: Express.Multer.File,
    requestContext?: ComplaintRequestContext
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

    if (data.type === "AFTER" || data.type === "INVOICE") {
      await this.complaintsRepository.updateStatus(
        id,
        ComplaintStatus.IN_PROGRESS,
        actor.id,
        "Work proof submitted"
      );
    }

    const evidence = await this.evidenceService.createEvidence(
      id,
      {
        type: data.type,
        note: data.note.trim(),
        invoiceVendorName: data.invoiceVendorName,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        invoiceAmount: data.invoiceAmount,
        latitude: data.latitude,
        longitude: data.longitude
      },
      actor.id,
      file,
      requestContext
    );

    const updatedComplaint = await this.complaintsRepository.updateStatus(
      id,
      data.markAsCompleted === false ? ComplaintStatus.IN_PROGRESS : ComplaintStatus.RESOLVED,
      actor.id,
      data.note.trim(),
      data.markAsCompleted === false
        ? {}
        : {
            resolvedAt: new Date()
          }
    );

    return {
      complaint: this.mapPrismaComplaintRecord(updatedComplaint, actor),
      evidence: [evidence]
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
    if (complaint.internalStatus !== ComplaintStatus.RESOLVED) {
      throw new AppError(
        "Only completed complaints can be verified by admin",
        StatusCodes.BAD_REQUEST,
        "INVALID_VERIFICATION_STATE"
      );
    }

    return this.updateStatus(
      id,
      {
        status: data.action === "approve" ? ComplaintStatus.CLOSED : ComplaintStatus.REOPENED,
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
    await this.getById(id, actor);
    const timeline = await this.complaintsRepository.getTimeline(id);

    return timeline.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      createdBy: entry.createdBy
        ? {
            id: entry.createdBy.id,
            fullName: entry.createdBy.fullName,
            role: entry.createdBy.role
          }
        : null
    }));
  }

  async addComment(id: string, data: AddCommentInput, actor: Actor) {
    const complaint = await this.complaintsRepository.findById(id);
    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const complaintDto = this.mapPrismaComplaintRecord(complaint, actor);
    this.ensureComplaintAccess(complaintDto, actor, "participant");

    const updatedComplaint = await this.complaintsRepository.addComment({
      complaintId: id,
      userId: actor.id,
      comment: data.comment.trim()
    });

    const createdComment = updatedComplaint.comments[updatedComplaint.comments.length - 1];
    if (!createdComment) {
      throw new AppError("Comment not found", StatusCodes.NOT_FOUND, "COMMENT_NOT_FOUND");
    }

    if (complaintDto.createdByUserId && complaintDto.createdByUserId !== actor.id) {
      await queueNotificationJob({
        userId: complaintDto.createdByUserId,
        complaintId: id,
        type: "SYSTEM",
        title: "New complaint comment",
        message: `A new comment was added to complaint ${id}.`
      }).catch((error) => {
        logger.warn({ error, complaintId: id }, "Failed to enqueue complaint comment notification");
      });
    }

    return mapComment(createdComment);
  }

  async listComments(id: string, actor: Actor) {
    await this.getById(id, actor);
    const comments = await this.complaintsRepository.listComments(id);
    return comments.map(mapComment);
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
        status: ComplaintStatus.REOPENED,
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
    const complaint = await this.complaintsRepository.findById(id);
    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    if (actor.role !== UserRole.CITIZEN || complaint.citizenId !== actor.id) {
      throw new AppError(
        "Only the complaint owner can submit feedback",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    if (complaint.feedback) {
      throw new AppError(
        "Feedback has already been submitted for this complaint",
        StatusCodes.CONFLICT,
        "FEEDBACK_EXISTS"
      );
    }

    const createdFeedback = await this.complaintsRepository.createFeedback({
      complaintId: id,
      citizenId: actor.id,
      departmentId: complaint.departmentId,
      officerId: complaint.assignedEmployeeId,
      rating: data.rating,
      comment: data.comment?.trim()
    });

    return createdFeedback.feedback;
  }

  private async resolveDepartmentId(departmentId?: string, departmentName?: string) {
    if (departmentId) {
      const department = await this.complaintsRepository.findDepartmentById(departmentId);
      return department?.id;
    }

    if (departmentName?.trim()) {
      const department = await this.complaintsRepository.findDepartmentByName(departmentName.trim());
      return department?.id;
    }

    return undefined;
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
    const complaints = await this.complaintsRepository.listMany(
      this.buildPrismaComplaintWhere(actor, filters)
    );
    return complaints.map((complaint) => this.mapPrismaComplaintListRecord(complaint, actor));
  }

  private async getComplaintDtoOrThrow(id: string, actor: Actor) {
    const complaint = await this.complaintsRepository.findById(id);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    return this.mapPrismaComplaintRecord(complaint, actor);
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
            items: [
              ...complaint.evidenceItems.map((item) => ({
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
              }))
            ],
            documents
          }
        : null,
      rejectionReason: complaint.status === ComplaintStatus.REJECTED ? "Rejected" : null
    };
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
}
