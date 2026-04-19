import { UserRole } from "@prisma/client";
import { v4 as uuid } from "uuid";

import {
  queryCivicPlatform,
  withCivicPlatformTransaction
} from "database/clients/civic-platform";

import type { TicketStatus } from "./ticket.types";

type UserSummary = {
  id: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
};

type ComplaintSummary = {
  id: string;
  title: string;
  status: string;
  area: string | null;
  pincode: string | null;
  locationAddress: string | null;
  citizenId: string;
  assignedEmployeeId: string | null;
  departmentId: string | null;
  citizen: UserSummary | null;
  assignedEmployee: UserSummary | null;
  department: {
    id: string | null;
    name: string;
  } | null;
};

type TicketRow = {
  id: string;
  complaintId: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  raisedById: string;
  raisedByFullName: string | null;
  raisedByRole: string | null;
  raisedByDepartmentId: string | null;
  complaintEntityId: string;
  complaintTitle: string | null;
  complaintStatus: string | null;
  complaintLocationAddress: string | null;
  complaintPincode: string | null;
  complaintDepartmentId: string | null;
  complaintCitizenId: string | null;
  complaintAssignedEmployeeId: string | null;
  citizenId: string | null;
  citizenFullName: string | null;
  citizenRole: string | null;
  citizenDepartmentId: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeFullName: string | null;
  assignedEmployeeRole: string | null;
  assignedEmployeeDepartmentId: string | null;
};

type ComplaintAccessRow = {
  id: string;
  title: string | null;
  status: string | null;
  pincode: string | null;
  locationAddress: string | null;
  citizenId: string | null;
  assignedEmployeeId: string | null;
  departmentId: string | null;
  citizenName: string | null;
  citizenRole: string | null;
  citizenDepartmentId: string | null;
  citizenEmail: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeRole: string | null;
  assignedEmployeeDepartmentId: string | null;
  assignedEmployeeEmail: string | null;
};

export type TicketRecord = {
  id: string;
  complaintId: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  raisedBy: UserSummary;
  complaint: ComplaintSummary;
};

export type TicketListRecord = TicketRecord;

export type ComplaintTicketAccessRecord = {
  id: string;
  title: string;
  status: string;
  pincode: string | null;
  locationAddress: string | null;
  citizenId: string;
  assignedEmployeeId: string | null;
  departmentId: string | null;
  citizen: (UserSummary & { email: string }) | null;
  assignedEmployee: ((UserSummary & { email: string }) | null);
};

const PINCODE_PATTERN = /\b\d{4,10}\b/;

const deriveArea = (locationAddress?: string | null, pincode?: string | null) => {
  const parts =
    locationAddress
      ?.split(",")
      .map((part) => part.trim().replace(PINCODE_PATTERN, "").trim())
      .filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return parts.slice(0, 2).join(", ");
  }

  if (parts[0]) {
    return parts[0];
  }

  return pincode ? `PIN ${pincode}` : null;
};

const normalizeRole = (value?: string | null): UserRole => {
  const normalized = value?.trim().toUpperCase();

  if (normalized === UserRole.SUPER_ADMIN) return UserRole.SUPER_ADMIN;
  if (normalized === UserRole.DEPARTMENT_ADMIN) return UserRole.DEPARTMENT_ADMIN;
  if (normalized === UserRole.EMPLOYEE) return UserRole.EMPLOYEE;
  return UserRole.CITIZEN;
};

const mapUser = (
  id: string | null,
  fullName: string | null,
  role: string | null,
  departmentId: string | null
): UserSummary | null => {
  if (!id || !fullName) {
    return null;
  }

  return {
    id,
    fullName,
    role: normalizeRole(role),
    departmentId
  };
};

const ticketBaseSelect = `
  t.id,
  t.complaint_id AS "complaintId",
  t.message,
  t.status,
  t.created_at::text AS "createdAt",
  raised_by.id AS "raisedById",
  raised_by.name AS "raisedByFullName",
  raised_by.role AS "raisedByRole",
  raised_by.department AS "raisedByDepartmentId",
  c.id AS "complaintEntityId",
  c.title AS "complaintTitle",
  c.status AS "complaintStatus",
  c.location_address AS "complaintLocationAddress",
  c.pincode AS "complaintPincode",
  c.department AS "complaintDepartmentId",
  c.citizen_id AS "complaintCitizenId",
  c.assigned_employee_id AS "complaintAssignedEmployeeId",
  citizen.id AS "citizenId",
  citizen.name AS "citizenFullName",
  citizen.role AS "citizenRole",
  citizen.department AS "citizenDepartmentId",
  employee.id AS "assignedEmployeeId",
  employee.name AS "assignedEmployeeFullName",
  employee.role AS "assignedEmployeeRole",
  employee.department AS "assignedEmployeeDepartmentId"
`;

function mapTicketRow(row: TicketRow): TicketRecord {
  return {
    id: row.id,
    complaintId: row.complaintId,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    raisedBy: {
      id: row.raisedById,
      fullName: row.raisedByFullName ?? "Citizen",
      role: normalizeRole(row.raisedByRole),
      departmentId: row.raisedByDepartmentId
    },
    complaint: {
      id: row.complaintEntityId,
      title: row.complaintTitle?.trim() || "Complaint",
      status: row.complaintStatus?.trim() || "OPEN",
      area: deriveArea(row.complaintLocationAddress, row.complaintPincode),
      pincode: row.complaintPincode?.trim() || null,
      locationAddress: row.complaintLocationAddress,
      citizenId: row.complaintCitizenId ?? row.citizenId ?? "",
      assignedEmployeeId: row.complaintAssignedEmployeeId,
      departmentId: row.complaintDepartmentId,
      citizen: mapUser(row.citizenId, row.citizenFullName, row.citizenRole, row.citizenDepartmentId),
      assignedEmployee: mapUser(
        row.assignedEmployeeId,
        row.assignedEmployeeFullName,
        row.assignedEmployeeRole,
        row.assignedEmployeeDepartmentId
      ),
      department: row.complaintDepartmentId
        ? {
            id: row.complaintDepartmentId,
            name: row.complaintDepartmentId
          }
        : null
    }
  };
}

export class TicketsRepository {
  async createTicket(data: {
    complaintId: string;
    raisedById: string;
    message: string;
  }) {
    const ticketId = uuid();
    const result = await queryCivicPlatform<{ id: string }>(
      `
        INSERT INTO public.tickets (
          id,
          complaint_id,
          raised_by,
          message,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `,
      [ticketId, data.complaintId, data.raisedById, data.message.trim()]
    );

    return this.findById(result.rows[0].id) as Promise<TicketRecord>;
  }

  async listByComplaint(complaintId: string) {
    const result = await queryCivicPlatform<TicketRow>(
      `
        SELECT ${ticketBaseSelect}
        FROM public.tickets t
        INNER JOIN public.complaints c
          ON c.id = t.complaint_id
        INNER JOIN public.users raised_by
          ON raised_by.id = t.raised_by
        LEFT JOIN public.users citizen
          ON citizen.id = c.citizen_id
        LEFT JOIN public.users employee
          ON employee.id = c.assigned_employee_id
        WHERE t.complaint_id = $1
        ORDER BY t.created_at DESC NULLS LAST, t.id DESC
      `,
      [complaintId]
    );

    return result.rows.map(mapTicketRow);
  }

  async listMany(filters?: { status?: TicketStatus }) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (filters?.status) {
      params.push(filters.status);
      where.push(`UPPER(COALESCE(t.status, 'PENDING')) = $${params.length}`);
    }

    const result = await queryCivicPlatform<TicketRow>(
      `
        SELECT ${ticketBaseSelect}
        FROM public.tickets t
        INNER JOIN public.complaints c
          ON c.id = t.complaint_id
        INNER JOIN public.users raised_by
          ON raised_by.id = t.raised_by
        LEFT JOIN public.users citizen
          ON citizen.id = c.citizen_id
        LEFT JOIN public.users employee
          ON employee.id = c.assigned_employee_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY t.created_at DESC NULLS LAST, t.id DESC
      `,
      params
    );

    return result.rows.map(mapTicketRow);
  }

  async findById(id: string) {
    const result = await queryCivicPlatform<TicketRow>(
      `
        SELECT ${ticketBaseSelect}
        FROM public.tickets t
        INNER JOIN public.complaints c
          ON c.id = t.complaint_id
        INNER JOIN public.users raised_by
          ON raised_by.id = t.raised_by
        LEFT JOIN public.users citizen
          ON citizen.id = c.citizen_id
        LEFT JOIN public.users employee
          ON employee.id = c.assigned_employee_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
  }

  async updateStatus(id: string, status: TicketStatus) {
    const result = await queryCivicPlatform<{ id: string }>(
      `
        UPDATE public.tickets
        SET
          status = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
      `,
      [id, status]
    );

    return result.rows[0] ? this.findById(result.rows[0].id) : null;
  }

  async findComplaintById(id: string) {
    const result = await queryCivicPlatform<ComplaintAccessRow>(
      `
        SELECT
          c.id,
          c.title,
          c.status,
          c.pincode,
          c.location_address AS "locationAddress",
          c.citizen_id AS "citizenId",
          c.assigned_employee_id AS "assignedEmployeeId",
          c.department AS "departmentId",
          citizen.name AS "citizenName",
          citizen.role AS "citizenRole",
          citizen.department AS "citizenDepartmentId",
          citizen.email AS "citizenEmail",
          employee.name AS "assignedEmployeeName",
          employee.role AS "assignedEmployeeRole",
          employee.department AS "assignedEmployeeDepartmentId",
          employee.email AS "assignedEmployeeEmail"
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

    const row = result.rows[0];

    if (!row || !row.citizenId) {
      return null;
    }

    return {
      id: row.id,
      title: row.title?.trim() || "Complaint",
      status: row.status?.trim() || "OPEN",
      pincode: row.pincode?.trim() || null,
      locationAddress: row.locationAddress,
      citizenId: row.citizenId,
      assignedEmployeeId: row.assignedEmployeeId,
      departmentId: row.departmentId,
      citizen: row.citizenName
        ? {
            id: row.citizenId,
            fullName: row.citizenName,
            role: normalizeRole(row.citizenRole),
            departmentId: row.citizenDepartmentId,
            email: row.citizenEmail ?? ""
          }
        : null,
      assignedEmployee: row.assignedEmployeeId && row.assignedEmployeeName
        ? {
            id: row.assignedEmployeeId,
            fullName: row.assignedEmployeeName,
            role: normalizeRole(row.assignedEmployeeRole),
            departmentId: row.assignedEmployeeDepartmentId,
            email: row.assignedEmployeeEmail ?? ""
          }
        : null
    };
  }

  async countPendingByComplaintAndUser(complaintId: string, userId: string) {
    const result = await queryCivicPlatform<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.tickets
        WHERE complaint_id = $1
          AND raised_by = $2
          AND UPPER(COALESCE(status, 'PENDING')) = 'PENDING'
      `,
      [complaintId, userId]
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async createEscalation(data: {
    complaintId: string;
    ticketId: string;
    triggeredBy: string;
    reason: string;
  }) {
    return withCivicPlatformTransaction(async (client) => {
      const escalationId = uuid();

      await client.query(
        `
          INSERT INTO public.escalations (
            id,
            complaint_id,
            ticket_id,
            triggered_by,
            reason,
            escalation_level,
            status,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, 1, 'OPEN', CURRENT_TIMESTAMP)
        `,
        [escalationId, data.complaintId, data.ticketId, data.triggeredBy, data.reason.trim()]
      );

      return escalationId;
    });
  }

  async listAdminRecipients(departmentId?: string | null) {
    const result = await queryCivicPlatform<{ id: string }>(
      `
        SELECT id
        FROM public.users
        WHERE UPPER(COALESCE(role, '')) IN ('DEPARTMENT_ADMIN', 'SUPER_ADMIN')
          AND (
            $1::text IS NULL
            OR COALESCE(department, '') = ''
            OR LOWER(COALESCE(department, '')) = LOWER($1)
            OR UPPER(COALESCE(role, '')) = 'SUPER_ADMIN'
          )
      `,
      [departmentId?.trim() || null]
    );

    return result.rows;
  }
}
