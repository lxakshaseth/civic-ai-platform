import { Prisma } from "@prisma/client";

import { prisma } from "database/clients/prisma";

const evidenceInclude = {
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  },
  reviewedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  }
} as const;

export type EvidenceRecord = Prisma.EvidenceGetPayload<{
  include: typeof evidenceInclude;
}>;

export class EvidenceRepository {
  createEvidence(data: Prisma.EvidenceUncheckedCreateInput) {
    return prisma.evidence.create({
      data,
      include: evidenceInclude
    });
  }

  findById(id: string) {
    return prisma.evidence.findUnique({
      where: { id },
      include: evidenceInclude
    });
  }

  listByComplaint(complaintId: string) {
    return prisma.evidence.findMany({
      where: { complaintId },
      orderBy: { createdAt: "desc" },
      include: evidenceInclude
    });
  }

  updateOcrData(
    id: string,
    data: {
      ocrText?: string;
      ocrConfidence?: number;
      ocrFields?: Prisma.InputJsonValue;
      invoiceVendorName?: string;
      invoiceNumber?: string;
      invoiceDate?: Date;
      invoiceAmount?: Prisma.Decimal | number;
      duplicateScore?: number;
      isDuplicate?: boolean;
      verificationStatus?: string;
    }
  ) {
    return prisma.evidence.update({
      where: { id },
      data,
      include: evidenceInclude
    });
  }

  reviewEvidence(
    id: string,
    data: {
      verificationStatus: string;
      reviewRemarks?: string;
      reviewedById: string;
    }
  ) {
    return prisma.evidence.update({
      where: { id },
      data: {
        verificationStatus: data.verificationStatus,
        reviewRemarks: data.reviewRemarks,
        reviewedById: data.reviewedById,
        reviewedAt: new Date()
      },
      include: evidenceInclude
    });
  }
}
