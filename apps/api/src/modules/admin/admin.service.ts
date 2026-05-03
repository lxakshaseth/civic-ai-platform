import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { queryCivicPlatform } from "database/clients/civic-platform";
import { prisma } from "database/clients/prisma";
import { ComplaintsService } from "modules/complaint/complaint.service";
import { EmployeesService } from "modules/employee/employees.service";
import { AppError } from "shared/errors/app-error";
import { getDepartmentAliases } from "utils/department-match";

type Actor = { id: string; email: string; role: UserRole };
type RequestContext = { ipAddress?: string; userAgent?: string };

type UnassignedComplaintRow = {
  complaintId: string;
  title: string | null;
  category: string | null;
  pincode: string | null;
  createdAt: string | null;
  department: string | null;
  status: string | null;
};

type SuggestedEmployeeRow = {
  id: string;
  name: string | null;
  employeeCode: string | null;
  department: string | null;
  pincode: string | null;
  currentWorkload: string;
  activeAssignments: string;
};

type SanitarySummaryRow = {
  totalRequests: string;
  totalApproved: string;
  totalPending: string;
  totalAmountTransferred: string;
  flaggedCount: string;
};

type SanitaryRequestRow = {
  id: string;
  citizenId: string | null;
  citizenName: string | null;
  dateApplied: string | null;
  upiId: string | null;
  amount: string | number | null;
  status: string | null;
  transactionId: string | null;
  paidAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  flaggedAt: string | null;
  reviewNote: string | null;
  fraudReason: string | null;
  invoiceNumber: string | null;
  vendorName: string | null;
  repeatedUpiClaims: string;
  citizenClaimsLast30Days: string;
  upiClaimsLast30Days: string;
};

type SanitaryStatus = "pending" | "approved" | "rejected" | "paid" | "flagged";

export class AdminService {
  constructor(
    private readonly employeesService: EmployeesService = new EmployeesService(),
    private readonly complaintsService: ComplaintsService = new ComplaintsService()
  ) {}

  async listEmployees(
    actor: Actor,
    filters: {
      department?: string;
      status?: string;
      search?: string;
    } = {}
  ) {
    return this.employeesService.listEmployees(actor, filters);
  }

  async getDashboard() {
    const [
      totalUsers,
      totalCitizens,
      employeeDirectoryCount,
      totalAdmins,
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      escalationsCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.CITIZEN } }),
      queryCivicPlatform<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.employees`
      ),
      prisma.user.count({
        where: {
          role: {
            in: [UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN]
          }
        }
      }),
      prisma.complaint.count(),
      prisma.complaint.count({
        where: {
          status: {
            in: ["RESOLVED", "CLOSED"]
          }
        }
      }),
      prisma.complaint.count({
        where: {
          status: {
            notIn: ["RESOLVED", "CLOSED"]
          }
        }
      }),
      prisma.ticket.count({
        where: {
          status: "PENDING"
        }
      })
    ]);

    return {
      totalUsers,
      totalCitizens,
      totalEmployees: Number(employeeDirectoryCount.rows[0]?.count ?? 0),
      totalAdmins,
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      escalationsCount
    };
  }

  getStats() {
    return this.getDashboard();
  }

  async listComplaints(
    actor: Actor,
    filters: {
      status?: string;
      departmentId?: string;
      assignedEmployeeId?: string;
      citizenId?: string;
      category?: string;
      priority?: string;
      search?: string;
    } = {}
  ) {
    return this.complaintsService.listAdminIssues(actor, filters);
  }

  async assignComplaint(
    actor: Actor,
    input: {
      complaintId: string;
      employeeId: string;
      departmentId?: string;
      note?: string;
    },
    requestContext?: RequestContext
  ) {
    return this.complaintsService.assignComplaint(
      input.complaintId,
      {
        employeeId: input.employeeId,
        departmentId: input.departmentId,
        note: input.note
      },
      actor,
      requestContext
    );
  }

  async approveComplaint(
    actor: Actor,
    input: {
      complaintId: string;
      note?: string;
    },
    requestContext?: RequestContext
  ) {
    return this.complaintsService.verifyComplaint(
      input.complaintId,
      {
        action: "approve",
        note: input.note
      },
      actor,
      requestContext
    );
  }

  async getSanitarySummary(actor: Actor) {
    this.assertAdmin(actor);

    const result = await queryCivicPlatform<SanitarySummaryRow>(
      `
        SELECT
          COUNT(*)::text AS "totalRequests",
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'pending')) IN ('approved', 'paid')
          )::text AS "totalApproved",
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'pending')) = 'pending'
          )::text AS "totalPending",
          COALESCE(
            SUM(
              CASE
                WHEN LOWER(COALESCE(status, 'pending')) = 'paid' THEN amount
                ELSE 0
              END
            ),
            0
          )::text AS "totalAmountTransferred",
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'pending')) = 'flagged'
          )::text AS "flaggedCount"
        FROM public.sanitary_reimbursement_requests
      `
    );

    return {
      totalRequests: Number(result.rows[0]?.totalRequests ?? 0),
      totalApproved: Number(result.rows[0]?.totalApproved ?? 0),
      totalPending: Number(result.rows[0]?.totalPending ?? 0),
      totalAmountTransferred: Number(result.rows[0]?.totalAmountTransferred ?? 0),
      flaggedCount: Number(result.rows[0]?.flaggedCount ?? 0)
    };
  }

  async listSanitaryRequests(
    actor: Actor,
    filters: {
      status?: string;
      search?: string;
    } = {}
  ) {
    this.assertAdmin(actor);

    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.status?.trim()) {
      params.push(filters.status.trim().toLowerCase());
      where.push(`LOWER(COALESCE(r.status, 'pending')) = $${params.length}`);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      where.push(`
        (
          LOWER(COALESCE(r.citizen_name, '')) LIKE $${params.length}
          OR LOWER(COALESCE(u."fullName", '')) LIKE $${params.length}
          OR LOWER(COALESCE(r.upi_id, '')) LIKE $${params.length}
          OR LOWER(COALESCE(r.transaction_id, '')) LIKE $${params.length}
          OR LOWER(COALESCE(r.invoice_number, '')) LIKE $${params.length}
        )
      `);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await queryCivicPlatform<SanitaryRequestRow>(
      `
        SELECT
          r.id,
          r.citizen_id AS "citizenId",
          COALESCE(
            NULLIF(BTRIM(r.citizen_name), ''),
            NULLIF(BTRIM(u."fullName"), ''),
            SPLIT_PART(COALESCE(u.email, ''), '@', 1),
            'Citizen'
          ) AS "citizenName",
          COALESCE(r.applied_at, r.created_at)::text AS "dateApplied",
          NULLIF(BTRIM(r.upi_id), '') AS "upiId",
          r.amount::text AS amount,
          LOWER(COALESCE(r.status, 'pending')) AS status,
          NULLIF(BTRIM(r.transaction_id), '') AS "transactionId",
          r.paid_at::text AS "paidAt",
          r.approved_at::text AS "approvedAt",
          r.rejected_at::text AS "rejectedAt",
          r.flagged_at::text AS "flaggedAt",
          NULLIF(BTRIM(r.review_note), '') AS "reviewNote",
          NULLIF(BTRIM(r.fraud_reason), '') AS "fraudReason",
          NULLIF(BTRIM(r.invoice_number), '') AS "invoiceNumber",
          NULLIF(BTRIM(r.vendor_name), '') AS "vendorName",
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests dup
            WHERE NULLIF(BTRIM(LOWER(dup.upi_id)), '') = NULLIF(BTRIM(LOWER(r.upi_id)), '')
          )::text AS "repeatedUpiClaims",
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests dup
            WHERE dup.citizen_id = r.citizen_id
              AND COALESCE(dup.applied_at, dup.created_at) >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          )::text AS "citizenClaimsLast30Days",
          (
            SELECT COUNT(*)
            FROM public.sanitary_reimbursement_requests dup
            WHERE NULLIF(BTRIM(LOWER(dup.upi_id)), '') = NULLIF(BTRIM(LOWER(r.upi_id)), '')
              AND COALESCE(dup.applied_at, dup.created_at) >= CURRENT_TIMESTAMP - INTERVAL '30 days'
          )::text AS "upiClaimsLast30Days"
        FROM public.sanitary_reimbursement_requests r
        LEFT JOIN public.users u
          ON u.id = r.citizen_id
        ${whereClause}
        ORDER BY COALESCE(r.applied_at, r.created_at) DESC, r.id DESC
      `,
      params
    );

    return result.rows.map((row) => {
      const repeatedUpiClaims = Number(row.repeatedUpiClaims ?? 0);
      const citizenClaimsLast30Days = Number(row.citizenClaimsLast30Days ?? 0);
      const upiClaimsLast30Days = Number(row.upiClaimsLast30Days ?? 0);
      const fraudSignals: string[] = [];

      if (repeatedUpiClaims > 1) {
        fraudSignals.push("Repeated UPI ID");
      }

      if (citizenClaimsLast30Days > 2) {
        fraudSignals.push("Multiple claims by same citizen");
      }

      if (upiClaimsLast30Days > 2) {
        fraudSignals.push("Too many recent claims on same UPI");
      }

      return {
        id: row.id,
        citizenId: row.citizenId,
        citizenName: row.citizenName?.trim() || "Citizen",
        dateApplied: row.dateApplied ?? null,
        upiId: row.upiId?.trim() || "Not provided",
        amount: Number(row.amount ?? 0),
        status: this.normalizeSanitaryStatus(row.status),
        transactionId: row.transactionId?.trim() || null,
        paidAt: row.paidAt ?? null,
        approvedAt: row.approvedAt ?? null,
        rejectedAt: row.rejectedAt ?? null,
        flaggedAt: row.flaggedAt ?? null,
        reviewNote: row.reviewNote?.trim() || null,
        fraudReason: row.fraudReason?.trim() || null,
        invoiceNumber: row.invoiceNumber?.trim() || null,
        vendorName: row.vendorName?.trim() || null,
        suspicious: fraudSignals.length > 0 || this.normalizeSanitaryStatus(row.status) === "flagged",
        fraudSignals,
        repeatedUpiClaims,
        citizenClaimsLast30Days,
        upiClaimsLast30Days
      };
    });
  }

  async approveSanitaryRequest(
    actor: Actor,
    id: string,
    input: {
      transactionId?: string;
      note?: string;
    } = {}
  ) {
    this.assertAdmin(actor);

    const transactionId =
      input.transactionId?.trim() ||
      `SAN-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`;

    const result = await queryCivicPlatform<SanitaryRequestRow>(
      `
        UPDATE public.sanitary_reimbursement_requests
        SET
          status = 'paid',
          transaction_id = $2,
          approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
          paid_at = CURRENT_TIMESTAMP,
          rejected_at = NULL,
          flagged_at = NULL,
          review_note = COALESCE(NULLIF($3, ''), review_note),
          fraud_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          citizen_id AS "citizenId",
          citizen_name AS "citizenName",
          COALESCE(applied_at, created_at)::text AS "dateApplied",
          upi_id AS "upiId",
          amount::text AS amount,
          status,
          transaction_id AS "transactionId",
          paid_at::text AS "paidAt",
          approved_at::text AS "approvedAt",
          rejected_at::text AS "rejectedAt",
          flagged_at::text AS "flaggedAt",
          review_note AS "reviewNote",
          fraud_reason AS "fraudReason",
          invoice_number AS "invoiceNumber",
          vendor_name AS "vendorName",
          '0'::text AS "repeatedUpiClaims",
          '0'::text AS "citizenClaimsLast30Days",
          '0'::text AS "upiClaimsLast30Days"
      `,
      [id, transactionId, input.note?.trim() ?? ""]
    );

    return this.assertSanitaryRequestFound(result.rows[0], id);
  }

  async rejectSanitaryRequest(
    actor: Actor,
    id: string,
    input: {
      note?: string;
    } = {}
  ) {
    this.assertAdmin(actor);

    const result = await queryCivicPlatform<SanitaryRequestRow>(
      `
        UPDATE public.sanitary_reimbursement_requests
        SET
          status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          approved_at = NULL,
          paid_at = NULL,
          flagged_at = NULL,
          review_note = COALESCE(NULLIF($2, ''), review_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          citizen_id AS "citizenId",
          citizen_name AS "citizenName",
          COALESCE(applied_at, created_at)::text AS "dateApplied",
          upi_id AS "upiId",
          amount::text AS amount,
          status,
          transaction_id AS "transactionId",
          paid_at::text AS "paidAt",
          approved_at::text AS "approvedAt",
          rejected_at::text AS "rejectedAt",
          flagged_at::text AS "flaggedAt",
          review_note AS "reviewNote",
          fraud_reason AS "fraudReason",
          invoice_number AS "invoiceNumber",
          vendor_name AS "vendorName",
          '0'::text AS "repeatedUpiClaims",
          '0'::text AS "citizenClaimsLast30Days",
          '0'::text AS "upiClaimsLast30Days"
      `,
      [id, input.note?.trim() ?? ""]
    );

    return this.assertSanitaryRequestFound(result.rows[0], id);
  }

  async flagSanitaryRequest(
    actor: Actor,
    id: string,
    input: {
      reason?: string;
      note?: string;
    } = {}
  ) {
    this.assertAdmin(actor);

    const result = await queryCivicPlatform<SanitaryRequestRow>(
      `
        UPDATE public.sanitary_reimbursement_requests
        SET
          status = 'flagged',
          flagged_at = CURRENT_TIMESTAMP,
          review_note = COALESCE(NULLIF($2, ''), review_note),
          fraud_reason = COALESCE(NULLIF($3, ''), fraud_reason, 'Suspicious reimbursement pattern'),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          citizen_id AS "citizenId",
          citizen_name AS "citizenName",
          COALESCE(applied_at, created_at)::text AS "dateApplied",
          upi_id AS "upiId",
          amount::text AS amount,
          status,
          transaction_id AS "transactionId",
          paid_at::text AS "paidAt",
          approved_at::text AS "approvedAt",
          rejected_at::text AS "rejectedAt",
          flagged_at::text AS "flaggedAt",
          review_note AS "reviewNote",
          fraud_reason AS "fraudReason",
          invoice_number AS "invoiceNumber",
          vendor_name AS "vendorName",
          '0'::text AS "repeatedUpiClaims",
          '0'::text AS "citizenClaimsLast30Days",
          '0'::text AS "upiClaimsLast30Days"
      `,
      [id, input.note?.trim() ?? "", input.reason?.trim() ?? ""]
    );

    return this.assertSanitaryRequestFound(result.rows[0], id);
  }

  async listUnassignedComplaints(actor: Actor) {
    this.assertAdmin(actor);

    const result = await queryCivicPlatform<UnassignedComplaintRow>(
      `
        SELECT
          c.id AS "complaintId",
          c.title,
          c.category,
          c.pincode,
          COALESCE(c.created_at, c."createdAt")::text AS "createdAt",
          c.department,
          c.status
        FROM public.complaints c
        WHERE COALESCE(c."assignedEmployeeId", c.assigned_employee_id::text) IS NULL
        ORDER BY COALESCE(c.created_at, c."createdAt") DESC NULLS LAST, c.id DESC
      `
    );

    return result.rows.map((row) => ({
      complaintId: row.complaintId,
      title: row.title?.trim() || "Untitled complaint",
      category: row.category?.trim() || "Other",
      pincode: row.pincode?.trim() || null,
      createdAt: row.createdAt ?? new Date().toISOString(),
      department: row.department?.trim() || "Unassigned",
      status: row.status?.trim()?.toUpperCase() || "OPEN"
    }));
  }

  async listSuggestedEmployees(actor: Actor, pincode: string, department?: string) {
    this.assertAdmin(actor);
    return this.getSuggestedEmployeesByPincode(pincode, department);
  }

  async assignTicket(
    actor: Actor,
    input: {
      complaintId: string;
      employeeId?: string;
      note?: string;
      autoAssign?: boolean;
    },
    requestContext?: RequestContext
  ) {
    this.assertAdmin(actor);

    const complaintResult = await queryCivicPlatform<{
      id: string;
      pincode: string | null;
    }>(
      `
        SELECT id, pincode
        FROM public.complaints
        WHERE id = $1
        LIMIT 1
      `,
      [input.complaintId]
    );

    const complaint = complaintResult.rows[0];

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    const complaintPincode = complaint.pincode?.trim() || null;

    if (!complaintPincode) {
      throw new AppError(
        "Complaint pincode is missing",
        StatusCodes.BAD_REQUEST,
        "COMPLAINT_PINCODE_REQUIRED"
      );
    }

    const suggestedEmployees = await this.getSuggestedEmployeesByPincode(
      complaintPincode,
      null
    );
    const targetEmployee =
      input.employeeId?.trim()
        ? suggestedEmployees.find((employee) => employee.id === input.employeeId?.trim())
        : suggestedEmployees[0];

    if (!targetEmployee) {
      throw new AppError(
        input.employeeId?.trim()
          ? "Employee is not available for this complaint pincode"
          : "No employees are available for this complaint pincode",
        StatusCodes.NOT_FOUND,
        "SUGGESTED_EMPLOYEE_NOT_FOUND"
      );
    }

    return this.complaintsService.assignComplaint(
      input.complaintId,
      {
        employeeId: targetEmployee.id,
        note:
          input.note?.trim() ||
          (input.employeeId?.trim() && !input.autoAssign
            ? "Assigned from Smart Assignment"
            : "Auto-assigned to the best available employee")
      },
      actor,
      requestContext
    );
  }

  private async getSuggestedEmployeesByPincode(pincode: string, department?: string | null) {
    const normalizedPincode = pincode.trim();

    if (!normalizedPincode) {
      throw new AppError("Invalid pincode", StatusCodes.BAD_REQUEST, "PINCODE_REQUIRED");
    }

    const params: unknown[] = [normalizedPincode];
    const where = [
      `NULLIF(BTRIM(e.pincode), '') = $1`,
      `LOWER(COALESCE(e.status, 'ACTIVE')) NOT IN ('inactive', 'disabled', 'terminated', 'blocked')`
    ];

    const departmentAliases = getDepartmentAliases(department);

    if (departmentAliases.length) {
      params.push(departmentAliases);
      where.push(`
        BTRIM(
          LOWER(
            REGEXP_REPLACE(
              REPLACE(COALESCE(e.department, ''), '&', ' and '),
              '[^a-zA-Z0-9]+',
              ' ',
              'g'
            )
          )
        ) = ANY($${params.length}::text[])
      `);
    }

    const result = await queryCivicPlatform<SuggestedEmployeeRow>(
      `
        SELECT
          e.id::text AS id,
          COALESCE(NULLIF(BTRIM(e.name), ''), SPLIT_PART(COALESCE(e.email, ''), '@', 1), 'Employee') AS name,
          NULLIF(BTRIM(e.employee_code), '') AS "employeeCode",
          NULLIF(BTRIM(e.department), '') AS department,
          NULLIF(BTRIM(e.pincode), '') AS pincode,
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(t.status::text, 'PENDING')) = 'PENDING' THEN t.id
            ELSE NULL
          END)::text AS "currentWorkload",
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(c.status::text, 'OPEN')) NOT IN ('CLOSED', 'RESOLVED') THEN c.id
            ELSE NULL
          END)::text AS "activeAssignments"
        FROM public.employees e
        LEFT JOIN public.complaints c
          ON COALESCE(c."assignedEmployeeId", c.assigned_employee_id::text) = e.id::text
        LEFT JOIN public."Ticket" t
          ON t."complaintId" = c.id
        WHERE ${where.join(" AND ")}
        GROUP BY
          e.id,
          e.name,
          e.email,
          e.employee_code,
          e.department,
          e.pincode
        ORDER BY
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(t.status::text, 'PENDING')) = 'PENDING' THEN t.id
            ELSE NULL
          END) ASC,
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(c.status::text, 'OPEN')) NOT IN ('CLOSED', 'RESOLVED') THEN c.id
            ELSE NULL
          END) ASC,
          COALESCE(NULLIF(BTRIM(e.name), ''), SPLIT_PART(COALESCE(e.email, ''), '@', 1), 'Employee') ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name?.trim() || "Employee",
      employeeCode:
        row.employeeCode?.trim() ||
        `EMP-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      department: row.department?.trim() || "Unassigned",
      pincode: row.pincode?.trim() || normalizedPincode,
      currentWorkload: Number(row.currentWorkload ?? 0),
      activeAssignments: Number(row.activeAssignments ?? 0)
    }));
  }

  private assertAdmin(actor: Actor) {
    if (actor.role !== UserRole.DEPARTMENT_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private normalizeSanitaryStatus(status?: string | null): SanitaryStatus {
    switch (status?.trim().toLowerCase()) {
      case "approved":
        return "approved";
      case "rejected":
        return "rejected";
      case "paid":
        return "paid";
      case "flagged":
        return "flagged";
      default:
        return "pending";
    }
  }

  private assertSanitaryRequestFound(record: SanitaryRequestRow | undefined, id: string) {
    if (!record) {
      throw new AppError(
        `Sanitary reimbursement request ${id} not found`,
        StatusCodes.NOT_FOUND,
        "SANITARY_REQUEST_NOT_FOUND"
      );
    }

    return {
      id: record.id,
      citizenId: record.citizenId,
      citizenName: record.citizenName?.trim() || "Citizen",
      dateApplied: record.dateApplied ?? null,
      upiId: record.upiId?.trim() || "Not provided",
      amount: Number(record.amount ?? 0),
      status: this.normalizeSanitaryStatus(record.status),
      transactionId: record.transactionId?.trim() || null,
      paidAt: record.paidAt ?? null,
      approvedAt: record.approvedAt ?? null,
      rejectedAt: record.rejectedAt ?? null,
      flaggedAt: record.flaggedAt ?? null,
      reviewNote: record.reviewNote?.trim() || null,
      fraudReason: record.fraudReason?.trim() || null,
      invoiceNumber: record.invoiceNumber?.trim() || null,
      vendorName: record.vendorName?.trim() || null
    };
  }
}
