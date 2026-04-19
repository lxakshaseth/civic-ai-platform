import { ComplaintStatus, EvidenceType, Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { getWorkflowStatus } from "constants/complaint-workflow";
import { SOCKET_EVENTS } from "constants/socket-events";
import { aiClient } from "integrations/ai/ai.client";
import { ComplaintsRepository } from "modules/complaint/complaint.repository";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { queueNotificationJob } from "queues/jobs/notification.job";
import { AppError } from "shared/errors/app-error";
import { emitToComplaintRoom, emitToUserRoom } from "sockets/socket.server";
import { calculateDistanceKm, isValidLatitude, isValidLongitude } from "utils/geo";
import { toPublicUploadPath } from "utils/uploads";

import { EvidenceRecord, EvidenceRepository } from "./evidence.repository";

type EvidenceVerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVIEW_REQUIRED";

type EvidenceCreateInput = {
  type: EvidenceType;
  note?: string;
  invoiceVendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  latitude?: number;
  longitude?: number;
};

type EvidenceReviewInput = {
  verificationStatus: EvidenceVerificationStatus;
  reviewRemarks?: string;
};

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

type DuplicateAssessment = {
  duplicateScore: number;
  isDuplicate: boolean;
  reason: string;
};

type InvoiceExtractionResult = {
  ocrFields: Prisma.InputJsonValue;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceAmount?: number;
};

const ALLOWED_EVIDENCE_REVIEW_TRANSITIONS: Record<
  EvidenceVerificationStatus,
  EvidenceVerificationStatus[]
> = {
  PENDING: ["APPROVED", "REJECTED", "REVIEW_REQUIRED"],
  REVIEW_REQUIRED: ["APPROVED", "REJECTED"],
  REJECTED: ["REVIEW_REQUIRED", "APPROVED"],
  APPROVED: []
};

const ALLOWED_RESOLUTION_EVIDENCE_UPLOAD_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.REOPENED
];

const ALLOWED_RESOLUTION_EVIDENCE_REVIEW_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.REOPENED,
  ComplaintStatus.CLOSED
];

export class EvidenceService {
  constructor(
    private readonly evidenceRepository: EvidenceRepository = new EvidenceRepository(),
    private readonly complaintsRepository: ComplaintsRepository = new ComplaintsRepository()
  ) {}

  async createEvidence(
    complaintId: string,
    input: EvidenceCreateInput,
    uploadedById: string,
    file?: Express.Multer.File,
    requestContext?: RequestContext,
    options: { notifyCitizen?: boolean } = {}
  ) {
    if (!file) {
      throw new AppError("Evidence file is required", StatusCodes.BAD_REQUEST, "FILE_REQUIRED");
    }

    this.validateGeoMetadata(input.latitude, input.longitude);

    const complaint = await this.complaintsRepository.findById(complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const actorProfile = await this.complaintsRepository.findActorProfile(uploadedById);

    if (!actorProfile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    this.ensureComplaintAccess(complaint, actorProfile, true);
    this.ensureEvidenceUploadAllowed(complaint.status, input.type);

    const duplicateAssessment = await this.detectDuplicateEvidence(complaintId, file, input, {
      complaintLatitude: complaint.latitude != null ? Number(complaint.latitude) : undefined,
      complaintLongitude: complaint.longitude != null ? Number(complaint.longitude) : undefined
    });
    const initialVerificationStatus = this.getInitialVerificationStatus({
      type: input.type,
      complaintStatus: complaint.status,
      duplicateAssessment
    });
    const manualInvoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : undefined;

    let evidence = await this.evidenceRepository.createEvidence({
      complaintId,
      uploadedById,
      type: input.type,
      fileName: file.originalname,
      filePath: file.path.replace(/\\/g, "/"),
      mimeType: file.mimetype,
      fileSize: file.size,
      note: input.note,
      invoiceVendorName: input.type === EvidenceType.INVOICE ? input.invoiceVendorName : undefined,
      invoiceNumber: input.type === EvidenceType.INVOICE ? input.invoiceNumber : undefined,
      invoiceDate: input.type === EvidenceType.INVOICE ? manualInvoiceDate : undefined,
      invoiceAmount: input.type === EvidenceType.INVOICE ? input.invoiceAmount : undefined,
      latitude: input.latitude,
      longitude: input.longitude,
      verificationStatus: initialVerificationStatus,
      duplicateScore: duplicateAssessment.duplicateScore,
      isDuplicate: duplicateAssessment.isDuplicate
    });

    if (input.type === "INVOICE") {
      try {
        const ocrResponse = await aiClient.extractInvoiceText({
          evidenceId: evidence.id,
          filePath: evidence.filePath
        });

        const extractedFields = this.extractInvoiceFields(ocrResponse.text);
        const invoiceDuplicateAssessment = await this.detectDuplicateEvidence(
          complaintId,
          file,
          {
            ...input,
            invoiceVendorName: evidence.invoiceVendorName ?? extractedFields.vendorName,
            invoiceNumber: evidence.invoiceNumber ?? extractedFields.invoiceNumber,
            invoiceDate:
              evidence.invoiceDate?.toISOString() ?? extractedFields.invoiceDate?.toISOString(),
            invoiceAmount: evidence.invoiceAmount ? Number(evidence.invoiceAmount) : extractedFields.invoiceAmount
          },
          {
            currentEvidenceId: evidence.id,
            complaintLatitude: complaint.latitude != null ? Number(complaint.latitude) : undefined,
            complaintLongitude: complaint.longitude != null ? Number(complaint.longitude) : undefined
          }
        );
        const verificationStatus = this.getInitialVerificationStatus({
          type: input.type,
          complaintStatus: complaint.status,
          duplicateAssessment: invoiceDuplicateAssessment,
          ocrConfidence: ocrResponse.confidence,
          hasStructuredInvoiceFields: this.hasStructuredInvoiceFields(
            evidence.invoiceVendorName ?? extractedFields.vendorName,
            evidence.invoiceNumber ?? extractedFields.invoiceNumber,
            evidence.invoiceDate ?? extractedFields.invoiceDate,
            evidence.invoiceAmount ? Number(evidence.invoiceAmount) : extractedFields.invoiceAmount
          )
        });

        evidence = await this.evidenceRepository.updateOcrData(evidence.id, {
          ocrText: ocrResponse.text,
          ocrConfidence: ocrResponse.confidence,
          ocrFields: extractedFields.ocrFields,
          invoiceVendorName: evidence.invoiceVendorName ?? extractedFields.vendorName,
          invoiceNumber: evidence.invoiceNumber ?? extractedFields.invoiceNumber,
          invoiceDate: evidence.invoiceDate ?? extractedFields.invoiceDate,
          invoiceAmount: evidence.invoiceAmount ?? extractedFields.invoiceAmount,
          duplicateScore: invoiceDuplicateAssessment.duplicateScore,
          isDuplicate: invoiceDuplicateAssessment.isDuplicate,
          verificationStatus
        });
      } catch {
        evidence = await this.evidenceRepository.updateOcrData(evidence.id, {
          ocrText: "OCR extraction unavailable",
          ocrConfidence: 0,
          verificationStatus: "REVIEW_REQUIRED"
        });
      }
    }

    await Promise.allSettled([
      this.complaintsRepository.addTimelineEntry({
        complaintId,
        eventType: "evidence.uploaded",
        title: "Evidence uploaded",
        description: input.note,
        createdById: uploadedById,
        metadata: {
          evidenceId: evidence.id,
          type: input.type,
          complaintStatus: complaint.status,
          verificationStatus: evidence.verificationStatus,
          duplicateScore: evidence.duplicateScore ?? null,
          isDuplicate: evidence.isDuplicate,
          duplicateReason: duplicateAssessment.reason,
          hasGeoMetadata: input.latitude != null && input.longitude != null
        }
      }),
      ...(options.notifyCitizen === false
        ? []
        : [
            queueNotificationJob({
              userId: complaint.citizenId,
              complaintId: complaint.id,
              type: "EVIDENCE",
              title: "New complaint evidence uploaded",
              message: `New ${input.type.toLowerCase()} evidence was uploaded for complaint ${complaint.id}`,
              data: {
                complaintId: complaint.id,
                evidenceId: evidence.id,
                evidenceType: input.type
              }
            })
          ]),
      queueAuditLogJob({
        userId: uploadedById,
        action: "evidence.created",
        entity: "Evidence",
        entityId: evidence.id,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        metadata: {
          complaintId,
          type: input.type,
          verificationStatus: evidence.verificationStatus,
          duplicateScore: evidence.duplicateScore ?? null,
          isDuplicate: evidence.isDuplicate,
          duplicateReason: duplicateAssessment.reason
        }
      })
    ]);

    this.emitEvidenceEvent(complaint.id, complaint.citizenId, complaint.assignedEmployeeId, {
      complaintId: complaint.id,
      evidenceId: evidence.id,
      type: "evidence_uploaded"
    });

    return this.formatEvidence(evidence, complaint);
  }

  async listByComplaint(complaintId: string, userId?: string) {
    const complaint = await this.complaintsRepository.findById(complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    if (userId) {
      const actorProfile = await this.complaintsRepository.findActorProfile(userId);

      if (!actorProfile) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
      }

      this.ensureComplaintAccess(complaint, actorProfile);
    }

    const evidenceItems = await this.evidenceRepository.listByComplaint(complaintId);

    return evidenceItems.map((item) => this.formatEvidence(item, complaint));
  }

  async reviewEvidence(
    evidenceId: string,
    input: EvidenceReviewInput,
    reviewedById: string,
    requestContext?: RequestContext
  ) {
    const evidence = await this.evidenceRepository.findById(evidenceId);

    if (!evidence) {
      throw new AppError("Evidence not found", StatusCodes.NOT_FOUND, "EVIDENCE_NOT_FOUND");
    }

    const complaint = await this.complaintsRepository.findById(evidence.complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const actorProfile = await this.complaintsRepository.findActorProfile(reviewedById);

    if (!actorProfile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    this.ensureComplaintAccess(complaint, actorProfile);

    if (
      actorProfile.role !== UserRole.DEPARTMENT_ADMIN &&
      actorProfile.role !== UserRole.SUPER_ADMIN
    ) {
      throw new AppError(
        "Only reviewers or admins can review evidence",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    this.ensureReviewTransition(
      (evidence.verificationStatus as EvidenceVerificationStatus | null) ?? "PENDING",
      input.verificationStatus
    );
    this.ensureEvidenceReviewConsistency(complaint.status, evidence.type, input.verificationStatus);

    const updatedEvidence = await this.evidenceRepository.reviewEvidence(evidenceId, {
      verificationStatus: input.verificationStatus,
      reviewRemarks: input.reviewRemarks,
      reviewedById
    });

    await Promise.allSettled([
      this.complaintsRepository.addTimelineEntry({
        complaintId: complaint.id,
        eventType: "evidence.reviewed",
        title: `Evidence ${input.verificationStatus.toLowerCase()}`,
        description: input.reviewRemarks,
        createdById: reviewedById,
        metadata: {
          evidenceId: updatedEvidence.id,
          previousVerificationStatus: evidence.verificationStatus ?? "PENDING",
          verificationStatus: input.verificationStatus,
          type: updatedEvidence.type
        }
      }),
      queueNotificationJob({
        userId: complaint.citizenId,
        complaintId: complaint.id,
        type: "EVIDENCE",
        title: "Evidence review completed",
        message: `Evidence for complaint ${complaint.id} was ${input.verificationStatus.toLowerCase()}`,
        data: {
          complaintId: complaint.id,
          evidenceId: updatedEvidence.id,
          verificationStatus: input.verificationStatus
        }
      }),
      queueNotificationJob({
        userId: updatedEvidence.uploadedById,
        complaintId: complaint.id,
        type: "EVIDENCE",
        title: "Evidence review completed",
        message: `Your evidence for complaint ${complaint.id} was ${input.verificationStatus.toLowerCase()}`,
        data: {
          complaintId: complaint.id,
          evidenceId: updatedEvidence.id,
          verificationStatus: input.verificationStatus
        }
      }),
      queueAuditLogJob({
        userId: reviewedById,
        action: "evidence.reviewed",
        entity: "Evidence",
        entityId: updatedEvidence.id,
        ipAddress: requestContext?.ipAddress,
        userAgent: requestContext?.userAgent,
        metadata: {
          complaintId: complaint.id,
          type: updatedEvidence.type,
          previousVerificationStatus: evidence.verificationStatus ?? "PENDING",
          verificationStatus: input.verificationStatus,
          reviewRemarks: input.reviewRemarks ?? null
        }
      })
    ]);

    this.emitEvidenceEvent(complaint.id, complaint.citizenId, complaint.assignedEmployeeId, {
      complaintId: complaint.id,
      evidenceId: updatedEvidence.id,
      type: "evidence_reviewed",
      verificationStatus: input.verificationStatus
    });

    return this.formatEvidence(updatedEvidence, complaint);
  }

  private validateGeoMetadata(latitude?: number, longitude?: number) {
    if ((latitude == null) !== (longitude == null)) {
      throw new AppError(
        "Latitude and longitude must be provided together",
        StatusCodes.BAD_REQUEST,
        "INVALID_GEO_METADATA"
      );
    }

    if (latitude != null && !isValidLatitude(latitude)) {
      throw new AppError("Invalid latitude value", StatusCodes.BAD_REQUEST, "INVALID_LATITUDE");
    }

    if (longitude != null && !isValidLongitude(longitude)) {
      throw new AppError("Invalid longitude value", StatusCodes.BAD_REQUEST, "INVALID_LONGITUDE");
    }
  }

  private ensureComplaintAccess(
    complaint: {
      citizenId: string;
      departmentId: string | null;
      assignedEmployeeId: string | null;
      assignments: Array<{ employeeId: string }>;
    },
    actor: { id: string; role: UserRole; departmentId: string | null },
    requireStaffAccess = false
  ) {
    const hasAccess =
      actor.role === UserRole.SUPER_ADMIN ||
      (actor.role === UserRole.CITIZEN && !requireStaffAccess && complaint.citizenId === actor.id) ||
      (actor.role === UserRole.EMPLOYEE && complaint.assignedEmployeeId === actor.id) ||
      actor.role === UserRole.DEPARTMENT_ADMIN;

    if (!hasAccess) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private ensureEvidenceUploadAllowed(status: ComplaintStatus, type: EvidenceType) {
    if (status === ComplaintStatus.REJECTED || status === ComplaintStatus.CLOSED) {
      throw new AppError(
        "Evidence cannot be uploaded for rejected or closed complaints",
        StatusCodes.BAD_REQUEST,
        "EVIDENCE_UPLOAD_NOT_ALLOWED"
      );
    }

    if (
      (type === EvidenceType.AFTER || type === EvidenceType.INVOICE) &&
      !ALLOWED_RESOLUTION_EVIDENCE_UPLOAD_STATUSES.includes(status)
    ) {
      throw new AppError(
        "After evidence and invoice proof can be uploaded only once work is in progress or completed",
        StatusCodes.BAD_REQUEST,
        "EVIDENCE_STATUS_MISMATCH"
      );
    }
  }

  private ensureReviewTransition(
    currentStatus: EvidenceVerificationStatus,
    nextStatus: EvidenceVerificationStatus
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    if (!ALLOWED_EVIDENCE_REVIEW_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      throw new AppError(
        `Invalid evidence review transition from ${currentStatus} to ${nextStatus}`,
        StatusCodes.BAD_REQUEST,
        "INVALID_EVIDENCE_REVIEW_TRANSITION"
      );
    }
  }

  private ensureEvidenceReviewConsistency(
    complaintStatus: ComplaintStatus,
    evidenceType: EvidenceType,
    verificationStatus: EvidenceVerificationStatus
  ) {
    if (
      verificationStatus === "APPROVED" &&
      (evidenceType === EvidenceType.AFTER || evidenceType === EvidenceType.INVOICE) &&
      !ALLOWED_RESOLUTION_EVIDENCE_REVIEW_STATUSES.includes(complaintStatus)
    ) {
      throw new AppError(
        "Resolution evidence cannot be approved before the complaint reaches the work stage",
        StatusCodes.BAD_REQUEST,
        "EVIDENCE_REVIEW_STATUS_MISMATCH"
      );
    }
  }

  private getInitialVerificationStatus(input: {
    type: EvidenceType;
    complaintStatus: ComplaintStatus;
    duplicateAssessment: DuplicateAssessment;
    ocrConfidence?: number;
    hasStructuredInvoiceFields?: boolean;
  }): EvidenceVerificationStatus {
    if (input.duplicateAssessment.isDuplicate) {
      return "REVIEW_REQUIRED";
    }

    if (
      input.type === EvidenceType.INVOICE &&
      (input.ocrConfidence == null ||
        input.ocrConfidence < 0.45 ||
        input.hasStructuredInvoiceFields === false)
    ) {
      return "REVIEW_REQUIRED";
    }

    if (
      input.type === EvidenceType.AFTER &&
      input.complaintStatus === ComplaintStatus.IN_PROGRESS
    ) {
      return "PENDING";
    }

    return "PENDING";
  }

  private hasStructuredInvoiceFields(
    vendorName?: string | null,
    invoiceNumber?: string | null,
    invoiceDate?: Date | null,
    invoiceAmount?: number | null
  ) {
    return Boolean(vendorName || invoiceNumber || invoiceDate || invoiceAmount != null);
  }

  private async detectDuplicateEvidence(
    complaintId: string,
    file: Express.Multer.File,
    input: EvidenceCreateInput,
    options?: {
      currentEvidenceId?: string;
      complaintLatitude?: number;
      complaintLongitude?: number;
    }
  ): Promise<DuplicateAssessment> {
    const evidenceItems = (await this.evidenceRepository.listByComplaint(complaintId)).filter(
      (item) => item.id !== options?.currentEvidenceId
    );

    let bestScore = 0.08;
    let reason = "No strong duplicate indicators";

    for (const item of evidenceItems) {
      if (item.type !== input.type) {
        continue;
      }

      const normalizedIncomingName = this.normalizeFileName(file.originalname);
      const normalizedExistingName = this.normalizeFileName(item.fileName);
      const exactMetadataMatch =
        normalizedIncomingName === normalizedExistingName &&
        item.fileSize === file.size &&
        item.mimeType === file.mimetype;

      if (exactMetadataMatch) {
        return {
          duplicateScore: 0.98,
          isDuplicate: true,
          reason: "Exact evidence file metadata match"
        };
      }

      let candidateScore = 0.08;
      let candidateReason = "Low similarity";

      const sizeDifferenceRatio = Math.abs(item.fileSize - file.size) / Math.max(file.size, 1);
      if (item.mimeType === file.mimetype) {
        candidateScore += 0.12;
        candidateReason = "Same evidence mime type";
      }
      if (sizeDifferenceRatio <= 0.02) {
        candidateScore += 0.28;
        candidateReason = "Near-identical evidence file size";
      } else if (sizeDifferenceRatio <= 0.1) {
        candidateScore += 0.12;
        candidateReason = "Similar evidence file size";
      }
      if (normalizedIncomingName === normalizedExistingName) {
        candidateScore += 0.2;
        candidateReason = "Matching file name and evidence type";
      }

      const distanceKm = calculateDistanceKm(
        {
          latitude: input.latitude,
          longitude: input.longitude
        },
        {
          latitude: item.latitude != null ? Number(item.latitude) : options?.complaintLatitude,
          longitude: item.longitude != null ? Number(item.longitude) : options?.complaintLongitude
        }
      );
      if (distanceKm != null && distanceKm <= 0.1) {
        candidateScore += 0.15;
        candidateReason = "Evidence captured at the same location";
      }

      if (input.type === EvidenceType.INVOICE) {
        const sameInvoiceNumber =
          Boolean(input.invoiceNumber) &&
          Boolean(item.invoiceNumber) &&
          input.invoiceNumber?.trim().toLowerCase() === item.invoiceNumber?.trim().toLowerCase();
        const sameVendorAndAmount =
          Boolean(input.invoiceVendorName) &&
          Boolean(item.invoiceVendorName) &&
          input.invoiceVendorName?.trim().toLowerCase() ===
            item.invoiceVendorName?.trim().toLowerCase() &&
          input.invoiceAmount != null &&
          item.invoiceAmount != null &&
          Number(item.invoiceAmount) === input.invoiceAmount;

        if (sameInvoiceNumber) {
          candidateScore += 0.35;
          candidateReason = "Matching invoice number";
        } else if (sameVendorAndAmount) {
          candidateScore += 0.22;
          candidateReason = "Matching invoice vendor and amount";
        }
      }

      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        reason = candidateReason;
      }
    }

    return {
      duplicateScore: Number(Math.min(0.98, bestScore).toFixed(2)),
      isDuplicate: bestScore >= 0.72,
      reason
    };
  }

  private extractInvoiceFields(text: string): InvoiceExtractionResult {
    const invoiceNumber = text.match(/invoice(?:\s+number)?[:#\s-]*([A-Z0-9-]+)/i)?.[1]?.trim();
    const invoiceAmountValue = text.match(/(?:amount|total)[:\s-]*([0-9]+(?:\.[0-9]{1,2})?)/i)?.[1];
    const invoiceDateValue = text.match(
      /(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})/i
    )?.[1];
    const vendorName = text.match(/vendor[:\s-]*([A-Za-z0-9 &.-]+)/i)?.[1]?.trim();
    const invoiceAmount = invoiceAmountValue ? Number(invoiceAmountValue) : undefined;
    const invoiceDate = invoiceDateValue ? new Date(invoiceDateValue) : undefined;

    return {
      ocrFields: {
        rawTextLength: text.length,
        extractionSource: "ocr_regex",
        vendorName: vendorName ?? null,
        invoiceNumber: invoiceNumber ?? null,
        invoiceDate: invoiceDate ? invoiceDate.toISOString() : null,
        invoiceAmount: invoiceAmount ?? null
      },
      vendorName,
      invoiceNumber,
      invoiceDate,
      invoiceAmount
    };
  }

  private formatEvidence(
    evidence: EvidenceRecord,
    complaint: {
      id: string;
      status: ComplaintStatus;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
    }
  ) {
    const geoValidation = this.getGeoValidationSummary(
      complaint.latitude != null ? Number(complaint.latitude) : undefined,
      complaint.longitude != null ? Number(complaint.longitude) : undefined,
      evidence.latitude != null ? Number(evidence.latitude) : undefined,
      evidence.longitude != null ? Number(evidence.longitude) : undefined
    );

    return {
      ...evidence,
      filePath: toPublicUploadPath(evidence.filePath),
      complaint: {
        id: complaint.id,
        internalStatus: complaint.status,
        status: getWorkflowStatus(complaint.status)
      },
      evidenceStage:
        evidence.type === EvidenceType.BEFORE
          ? "BEFORE"
          : evidence.type === EvidenceType.AFTER
            ? "AFTER"
            : evidence.type === EvidenceType.INVOICE
              ? "RESOLUTION_PROOF"
              : "SUPPORTING",
      invoice: {
        vendorName: evidence.invoiceVendorName,
        invoiceNumber: evidence.invoiceNumber,
        invoiceDate: evidence.invoiceDate,
        invoiceAmount: evidence.invoiceAmount,
        ocrText: evidence.ocrText,
        ocrConfidence: evidence.ocrConfidence,
        ocrFields: evidence.ocrFields
      },
      review: {
        verificationStatus: evidence.verificationStatus,
        reviewRemarks: evidence.reviewRemarks,
        reviewedAt: evidence.reviewedAt,
        reviewedBy: evidence.reviewedBy
      },
      duplicateAnalysis: {
        duplicateScore: evidence.duplicateScore,
        isDuplicate: evidence.isDuplicate
      },
      geo: {
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        validation: geoValidation
      }
    };
  }

  private getGeoValidationSummary(
    complaintLatitude?: number,
    complaintLongitude?: number,
    evidenceLatitude?: number,
    evidenceLongitude?: number
  ) {
    if (evidenceLatitude == null || evidenceLongitude == null) {
      return {
        status: "NOT_PROVIDED",
        distanceKm: null,
        message: "Geo metadata not provided"
      };
    }

    if (complaintLatitude == null || complaintLongitude == null) {
      return {
        status: "UNVERIFIED",
        distanceKm: null,
        message: "Complaint location is unavailable for geo consistency checks"
      };
    }

    const distanceKm = calculateDistanceKm(
      { latitude: complaintLatitude, longitude: complaintLongitude },
      { latitude: evidenceLatitude, longitude: evidenceLongitude }
    );

    if (distanceKm == null) {
      return {
        status: "UNVERIFIED",
        distanceKm: null,
        message: "Geo consistency could not be calculated"
      };
    }

    return {
      status: distanceKm <= 1 ? "VALID" : "REVIEW_REQUIRED",
      distanceKm: Number(distanceKm.toFixed(2)),
      message:
        distanceKm <= 1
          ? "Evidence geo metadata is reasonably close to the complaint location"
          : "Evidence geo metadata is far from the complaint location and should be reviewed"
    };
  }

  private normalizeFileName(fileName: string) {
    return fileName.trim().toLowerCase();
  }

  private emitEvidenceEvent(
    complaintId: string,
    citizenId: string,
    assignedEmployeeId: string | null,
    payload: Record<string, unknown>
  ) {
    emitToComplaintRoom(complaintId, SOCKET_EVENTS.complaintUpdated, payload);
    emitToUserRoom(citizenId, SOCKET_EVENTS.complaintUpdated, payload);

    if (assignedEmployeeId) {
      emitToUserRoom(assignedEmployeeId, SOCKET_EVENTS.complaintUpdated, payload);
    }
  }
}
