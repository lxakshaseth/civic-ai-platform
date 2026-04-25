import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";

import { queryCivicPlatform } from "database/clients/civic-platform";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";
import { toPublicUploadPath } from "utils/uploads";

type Actor = {
  id: string;
  email: string;
  role: UserRole;
};

type CreateSanitaryRequestInput = {
  pincode: string;
  storeId: string;
  storeName: string;
  invoiceNumber: string;
  purchaseAmount: number;
  reimbursementLimit: number;
  upiId: string;
};

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

type CreatedSanitaryRequestRow = {
  id: string;
  citizenId: string | null;
  citizenName: string | null;
  upiId: string | null;
  amount: string | number | null;
  status: string | null;
  invoiceNumber: string | null;
  vendorName: string | null;
  billFilePath: string | null;
  appliedAt: string | null;
  fraudReason: string | null;
};

export class SanitaryService {
  async createRequest(
    actor: Actor,
    input: CreateSanitaryRequestInput,
    file?: Express.Multer.File,
    requestContext?: RequestContext
  ) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    if (!file) {
      throw new AppError(
        "GST bill upload is required",
        StatusCodes.BAD_REQUEST,
        "SANITARY_BILL_REQUIRED"
      );
    }

    const userResult = await queryCivicPlatform<{
      id: string;
      fullName: string;
    }>(
      `
        SELECT
          id,
          COALESCE(NULLIF(BTRIM(name), ''), SPLIT_PART(COALESCE(email, ''), '@', 1), 'Citizen') AS "fullName"
        FROM public.users
        WHERE id = $1
        LIMIT 1
      `,
      [actor.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new AppError("Citizen not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    const cappedAmount = Number(
      Math.min(input.purchaseAmount, input.reimbursementLimit).toFixed(2)
    );

    const fraudAnalysis = await this.detectFraudSignals({
      citizenId: actor.id,
      upiId: input.upiId,
      invoiceNumber: input.invoiceNumber
    });

    const recordId = uuid();
    const inserted = await queryCivicPlatform<CreatedSanitaryRequestRow>(
      `
        INSERT INTO public.sanitary_reimbursement_requests (
          id,
          citizen_id,
          citizen_name,
          upi_id,
          amount,
          status,
          invoice_number,
          vendor_name,
          bill_file_path,
          review_note,
          fraud_reason,
          applied_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          citizen_id AS "citizenId",
          citizen_name AS "citizenName",
          upi_id AS "upiId",
          amount::text AS amount,
          status,
          invoice_number AS "invoiceNumber",
          vendor_name AS "vendorName",
          bill_file_path AS "billFilePath",
          applied_at::text AS "appliedAt",
          fraud_reason AS "fraudReason"
      `,
      [
        recordId,
        actor.id,
        user.fullName,
        input.upiId.trim(),
        cappedAmount,
        fraudAnalysis.shouldFlag ? "flagged" : "pending",
        input.invoiceNumber.trim(),
        input.storeName.trim(),
        file.path.replace(/\\/g, "/"),
        `Pincode ${input.pincode.trim()} | Store ${input.storeId.trim()}`,
        fraudAnalysis.reason
      ]
    );

    const createdRequest = inserted.rows[0];

    await queueAuditLogJob({
      userId: actor.id,
      action: "sanitary.request_created",
      entity: "SanitaryReimbursement",
      entityId: createdRequest.id,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata: {
        pincode: input.pincode.trim(),
        storeId: input.storeId.trim(),
        storeName: input.storeName.trim(),
        invoiceNumber: input.invoiceNumber.trim(),
        purchaseAmount: input.purchaseAmount,
        reimbursementLimit: input.reimbursementLimit,
        reimbursableAmount: cappedAmount,
        upiId: input.upiId.trim(),
        autoFlagged: fraudAnalysis.shouldFlag,
        fraudReason: fraudAnalysis.reason ?? null
      }
    }).catch(() => undefined);

    return {
      id: createdRequest.id,
      citizenId: createdRequest.citizenId,
      citizenName: createdRequest.citizenName?.trim() || user.fullName,
      upiId: createdRequest.upiId?.trim() || input.upiId.trim(),
      amount: Number(createdRequest.amount ?? cappedAmount),
      status: (createdRequest.status?.trim().toLowerCase() || "pending") as
        | "pending"
        | "flagged",
      invoiceNumber: createdRequest.invoiceNumber?.trim() || input.invoiceNumber.trim(),
      vendorName: createdRequest.vendorName?.trim() || input.storeName.trim(),
      billFilePath: toPublicUploadPath(createdRequest.billFilePath),
      appliedAt: createdRequest.appliedAt,
      fraudReason: createdRequest.fraudReason?.trim() || null,
      message: fraudAnalysis.shouldFlag
        ? "GST bill submitted and flagged for manual verification."
        : "GST bill submitted successfully for admin review."
    };
  }

  private async detectFraudSignals(input: {
    citizenId: string;
    upiId: string;
    invoiceNumber: string;
  }) {
    const result = await queryCivicPlatform<{
      citizenClaimsLast30Days: string;
      upiClaimsLast30Days: string;
      invoiceDuplicates: string;
    }>(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests r
            WHERE r.citizen_id = $1
              AND COALESCE(r.applied_at, r.created_at) >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          )::text AS "citizenClaimsLast30Days",
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests r
            WHERE LOWER(COALESCE(r.upi_id, '')) = LOWER($2)
              AND COALESCE(r.applied_at, r.created_at) >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          )::text AS "upiClaimsLast30Days",
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests r
            WHERE LOWER(COALESCE(r.invoice_number, '')) = LOWER($3)
          )::text AS "invoiceDuplicates"
      `,
      [input.citizenId, input.upiId.trim(), input.invoiceNumber.trim()]
    );

    const citizenClaimsLast30Days = Number(result.rows[0]?.citizenClaimsLast30Days ?? 0);
    const upiClaimsLast30Days = Number(result.rows[0]?.upiClaimsLast30Days ?? 0);
    const invoiceDuplicates = Number(result.rows[0]?.invoiceDuplicates ?? 0);
    const reasons: string[] = [];

    if (invoiceDuplicates > 0) {
      reasons.push("Duplicate invoice number");
    }

    if (upiClaimsLast30Days > 0) {
      reasons.push("Repeated UPI ID");
    }

    if (citizenClaimsLast30Days >= 2) {
      reasons.push("Multiple claims by same citizen in 30 days");
    }

    if (upiClaimsLast30Days >= 2) {
      reasons.push("Too many recent claims on same UPI");
    }

    return {
      shouldFlag: reasons.length > 0,
      reason: reasons.length ? reasons.join(", ") : null
    };
  }
}
