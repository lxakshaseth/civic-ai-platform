import { UserRole } from "@prisma/client";

import { queryCivicPlatform } from "database/clients/civic-platform";

type DepartmentRecord = {
  id: string;
  name: string;
  description: string | null;
};

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  departmentId: string | null;
  department: {
    id: string | null;
    name: string;
  } | null;
  createdAt: string | null;
};

const userBaseSelect = `
  u.id,
  COALESCE(NULLIF(BTRIM(u.name), ''), SPLIT_PART(COALESCE(u.email, ''), '@', 1), 'User') AS "fullName",
  COALESCE(u.email, '') AS email,
  u.phone,
  CASE
    WHEN UPPER(COALESCE(u.role, '')) = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
    WHEN UPPER(COALESCE(u.role, '')) IN ('ADMIN', 'DEPARTMENT_ADMIN') THEN 'DEPARTMENT_ADMIN'
    WHEN UPPER(COALESCE(u.role, '')) = 'EMPLOYEE' THEN 'EMPLOYEE'
    ELSE 'CITIZEN'
  END AS role,
  CASE
    WHEN LOWER(COALESCE(u.status, 'ACTIVE')) IN ('inactive', 'disabled', 'terminated', 'blocked')
      THEN false
    ELSE true
  END AS "isActive",
  CAST(d.id AS TEXT) AS "departmentId",
  d.name AS "departmentName",
  u.created_at::text AS "createdAt"
`;

function normalizeRole(role: string | UserRole | undefined | null): UserRole {
  const normalizedRole = role?.toString().trim().toUpperCase();

  if (normalizedRole === "SUPER_ADMIN") {
    return UserRole.SUPER_ADMIN;
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "DEPARTMENT_ADMIN") {
    return UserRole.DEPARTMENT_ADMIN;
  }

  if (normalizedRole === "EMPLOYEE") {
    return UserRole.EMPLOYEE;
  }

  return UserRole.CITIZEN;
}

function mapUser(row: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string | null;
}): UserRecord {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: normalizeRole(row.role),
    isActive: row.isActive,
    departmentId: row.departmentId,
    department:
      row.departmentName
        ? {
            id: row.departmentId,
            name: row.departmentName
          }
        : null,
    createdAt: row.createdAt
  };
}

export class UsersRepository {
  async listDepartments() {
    const result = await queryCivicPlatform<DepartmentRecord>(
      `
        SELECT DISTINCT
          CAST(id AS TEXT) AS id,
          name,
          NULL::text AS description
        FROM public.departments
        WHERE NULLIF(BTRIM(name), '') IS NOT NULL
        UNION
        SELECT DISTINCT
          NULL::text AS id,
          department AS name,
          NULL::text AS description
        FROM public.users
        WHERE NULLIF(BTRIM(department), '') IS NOT NULL
        ORDER BY name ASC
      `
    );

    return result.rows;
  }

  async listUsers(filters: {
    role?: UserRole;
    departmentId?: string;
    isActive?: boolean;
    search?: string;
  } = {}) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.role) {
      params.push(filters.role);
      where.push(`
        CASE
          WHEN UPPER(COALESCE(u.role, '')) = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
          WHEN UPPER(COALESCE(u.role, '')) IN ('ADMIN', 'DEPARTMENT_ADMIN') THEN 'DEPARTMENT_ADMIN'
          WHEN UPPER(COALESCE(u.role, '')) = 'EMPLOYEE' THEN 'EMPLOYEE'
          ELSE 'CITIZEN'
        END = $${params.length}
      `);
    }

    if (filters.departmentId) {
      params.push(filters.departmentId);
      where.push(`CAST(d.id AS TEXT) = $${params.length}`);
    }

    if (filters.isActive != null) {
      params.push(filters.isActive);
      where.push(`
        (
          CASE
            WHEN LOWER(COALESCE(u.status, 'ACTIVE')) IN ('inactive', 'disabled', 'terminated', 'blocked')
              THEN false
            ELSE true
          END
        ) = $${params.length}
      `);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      where.push(`
        (
          COALESCE(u.name, '') ILIKE $${params.length}
          OR COALESCE(u.email, '') ILIKE $${params.length}
          OR COALESCE(u.phone, '') ILIKE $${params.length}
          OR COALESCE(u.employee_code, '') ILIKE $${params.length}
        )
      `);
    }

    const result = await queryCivicPlatform<{
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      role: string;
      isActive: boolean;
      departmentId: string | null;
      departmentName: string | null;
      createdAt: string | null;
    }>(
      `
        SELECT ${userBaseSelect}
        FROM public.users u
        LEFT JOIN public.departments d
          ON LOWER(COALESCE(d.name, '')) = LOWER(COALESCE(u.department, ''))
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY u.created_at DESC NULLS LAST, u.email ASC
      `,
      params
    );

    return result.rows.map(mapUser);
  }

  async findById(id: string) {
    const result = await queryCivicPlatform<{
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      role: string;
      isActive: boolean;
      departmentId: string | null;
      departmentName: string | null;
      createdAt: string | null;
    }>(
      `
        SELECT ${userBaseSelect}
        FROM public.users u
        LEFT JOIN public.departments d
          ON LOWER(COALESCE(d.name, '')) = LOWER(COALESCE(u.department, ''))
        WHERE u.id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  findByEmail(email: string) {
    return queryCivicPlatform<{
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      role: string;
      isActive: boolean;
      departmentId: string | null;
      departmentName: string | null;
      createdAt: string | null;
    }>(
      `
        SELECT ${userBaseSelect}
        FROM public.users u
        LEFT JOIN public.departments d
          ON LOWER(COALESCE(d.name, '')) = LOWER(COALESCE(u.department, ''))
        WHERE LOWER(COALESCE(u.email, '')) = LOWER($1)
        LIMIT 1
      `,
      [email.trim()]
    ).then((result) => (result.rows[0] ? mapUser(result.rows[0]) : null));
  }

  async updateRole(
    id: string,
    data: { role: UserRole; departmentId?: string | null; isActive?: boolean }
  ) {
    const departmentName = data.departmentId
      ? await queryCivicPlatform<{ name: string }>(
          `SELECT name FROM public.departments WHERE CAST(id AS TEXT) = $1 LIMIT 1`,
          [data.departmentId]
        ).then((result) => result.rows[0]?.name ?? null)
      : null;

    await queryCivicPlatform(
      `
        UPDATE public.users
        SET
          role = $2,
          department = $3,
          status = CASE
            WHEN $4::boolean IS NULL THEN status
            WHEN $4::boolean = true THEN 'ACTIVE'
            ELSE 'INACTIVE'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        id,
        data.role === UserRole.DEPARTMENT_ADMIN ? "ADMIN" : data.role,
        departmentName,
        data.isActive ?? null
      ]
    );

    return this.findById(id);
  }

  async upsertEmployeeShadowUser(data: {
    email: string;
    fullName: string;
    phone?: string | null;
    departmentName?: string | null;
    isActive?: boolean;
  }) {
    return this.upsertCivicShadowUser({
      ...data,
      role: UserRole.EMPLOYEE
    });
  }

  async upsertCivicShadowUser(data: {
    email: string;
    fullName: string;
    role: UserRole;
    phone?: string | null;
    departmentName?: string | null;
    isActive?: boolean;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedRole = data.role === UserRole.DEPARTMENT_ADMIN ? "ADMIN" : data.role;
    const existing = await this.findByEmail(normalizedEmail);

    if (data.departmentName?.trim()) {
      await queryCivicPlatform(
        `
          INSERT INTO public.departments (name)
          SELECT $1
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.departments
            WHERE LOWER(COALESCE(name, '')) = LOWER($1)
          )
        `,
        [data.departmentName.trim()]
      );
    }

    if (existing) {
      await queryCivicPlatform(
        `
          UPDATE public.users
          SET
            name = $2,
            phone = $3,
            role = $4,
            department = $5,
            status = CASE WHEN $6::boolean THEN 'ACTIVE' ELSE 'INACTIVE' END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          existing.id,
          data.fullName.trim(),
          data.phone?.trim() || null,
          normalizedRole,
          data.departmentName?.trim() || null,
          data.isActive ?? true
        ]
      );

      return this.findById(existing.id);
    }

    const created = await queryCivicPlatform<{ id: string }>(
      `
        INSERT INTO public.users (
          name,
          email,
          phone,
          role,
          department,
          status,
          language,
          created_at,
          updated_at,
          profile_completed
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'en', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
        RETURNING id
      `,
      [
        data.fullName.trim(),
        normalizedEmail,
        data.phone?.trim() || null,
        normalizedRole,
        data.departmentName?.trim() || null,
        data.isActive ?? true ? "ACTIVE" : "INACTIVE"
      ]
    );

    return this.findById(created.rows[0].id);
  }
}
