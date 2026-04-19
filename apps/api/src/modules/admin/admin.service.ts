import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { queryCivicPlatform } from "database/clients/civic-platform";
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
    const [complaintStats, userStats, escalationStats] = await Promise.all([
      queryCivicPlatform<{
        totalComplaints: string;
        resolvedComplaints: string;
        pendingComplaints: string;
      }>(
        `
          SELECT
            COUNT(*)::text AS "totalComplaints",
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(status, 'OPEN')) IN ('RESOLVED', 'CLOSED')
            )::text AS "resolvedComplaints",
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(status, 'OPEN')) NOT IN ('RESOLVED', 'CLOSED')
            )::text AS "pendingComplaints"
          FROM public.complaints
        `
      ),
      queryCivicPlatform<{
        totalUsers: string;
        totalCitizens: string;
        totalEmployees: string;
        totalAdmins: string;
      }>(
        `
          SELECT
            COUNT(*)::text AS "totalUsers",
            COUNT(*) FILTER (WHERE UPPER(COALESCE(role, '')) = 'CITIZEN')::text AS "totalCitizens",
            COUNT(*) FILTER (WHERE UPPER(COALESCE(role, '')) = 'EMPLOYEE')::text AS "totalEmployees",
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(role, '')) IN ('DEPARTMENT_ADMIN', 'SUPER_ADMIN')
            )::text AS "totalAdmins"
          FROM public.users
        `
      ),
      queryCivicPlatform<{ escalationsCount: string }>(
        `
          SELECT COUNT(*)::text AS "escalationsCount"
          FROM public.escalations
        `
      )
    ]);

    return {
      totalUsers: Number(userStats.rows[0]?.totalUsers ?? 0),
      totalCitizens: Number(userStats.rows[0]?.totalCitizens ?? 0),
      totalEmployees: Number(userStats.rows[0]?.totalEmployees ?? 0),
      totalAdmins: Number(userStats.rows[0]?.totalAdmins ?? 0),
      totalComplaints: Number(complaintStats.rows[0]?.totalComplaints ?? 0),
      resolvedComplaints: Number(complaintStats.rows[0]?.resolvedComplaints ?? 0),
      pendingComplaints: Number(complaintStats.rows[0]?.pendingComplaints ?? 0),
      escalationsCount: Number(escalationStats.rows[0]?.escalationsCount ?? 0)
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

  async listUnassignedComplaints(actor: Actor) {
    this.assertAdmin(actor);

    const result = await queryCivicPlatform<UnassignedComplaintRow>(
      `
        SELECT
          c.id AS "complaintId",
          c.title,
          c.category,
          c.pincode,
          c.created_at::text AS "createdAt",
          c.department,
          c.status
        FROM public.complaints c
        WHERE c.assigned_employee_id IS NULL
        ORDER BY c.created_at DESC NULLS LAST, c.id DESC
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
      `UPPER(COALESCE(u.role, '')) = 'EMPLOYEE'`,
      `NULLIF(BTRIM(u.pincode), '') = $1`,
      `LOWER(COALESCE(u.status, 'ACTIVE')) NOT IN ('inactive', 'disabled', 'terminated', 'blocked')`
    ];

    const departmentAliases = getDepartmentAliases(department);

    if (departmentAliases.length) {
      params.push(departmentAliases);
      where.push(`
        BTRIM(
          LOWER(
            REGEXP_REPLACE(
              REPLACE(COALESCE(u.department, ''), '&', ' and '),
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
          u.id,
          COALESCE(NULLIF(BTRIM(u.name), ''), SPLIT_PART(COALESCE(u.email, ''), '@', 1), 'Employee') AS name,
          NULLIF(BTRIM(u.employee_code), '') AS "employeeCode",
          NULLIF(BTRIM(u.department), '') AS department,
          NULLIF(BTRIM(u.pincode), '') AS pincode,
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(t.status, 'PENDING')) = 'PENDING' THEN t.id
            ELSE NULL
          END)::text AS "currentWorkload",
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(c.status, 'OPEN')) NOT IN ('CLOSED', 'RESOLVED') THEN c.id
            ELSE NULL
          END)::text AS "activeAssignments"
        FROM public.users u
        LEFT JOIN public.complaints c
          ON c.assigned_employee_id = u.id
        LEFT JOIN public.tickets t
          ON t.complaint_id = c.id
        WHERE ${where.join(" AND ")}
        GROUP BY
          u.id,
          u.name,
          u.email,
          u.employee_code,
          u.department,
          u.pincode
        ORDER BY
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(t.status, 'PENDING')) = 'PENDING' THEN t.id
            ELSE NULL
          END) ASC,
          COUNT(DISTINCT CASE
            WHEN UPPER(COALESCE(c.status, 'OPEN')) NOT IN ('CLOSED', 'RESOLVED') THEN c.id
            ELSE NULL
          END) ASC,
          COALESCE(NULLIF(BTRIM(u.name), ''), SPLIT_PART(COALESCE(u.email, ''), '@', 1), 'Employee') ASC
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
}
