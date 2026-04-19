import { StatusCodes } from "http-status-codes";

import { civicPlatformPool } from "database/clients/civic-platform";
import { AppError } from "shared/errors/app-error";

export type CivicUserRole = "CITIZEN" | "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";

export interface CivicUserRecord {
  civicUserId: number;
  name: string | null;
  email: string | null;
  password?: string | null;
  rawRole: string | null;
  normalizedRole: CivicUserRole;
  department: string | null;
  employeeCode: string | null;
  gender: string | null;
  age: number | null;
  phone: string | null;
  status: string | null;
  dateOfBirth: string | null;
  aadharNumber: string | null;
  panNumber: string | null;
  permanentAddress: string | null;
  pincode: string | null;
  category: string | null;
  profileCompleted: boolean | null;
  createdAt: string | null;
}

const normalizedRoleSql = `
  CASE
    WHEN UPPER(COALESCE(role, '')) = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
    WHEN UPPER(COALESCE(role, '')) IN ('ADMIN', 'DEPARTMENT_ADMIN') THEN 'ADMIN'
    WHEN UPPER(COALESCE(role, '')) = 'EMPLOYEE' THEN 'EMPLOYEE'
    ELSE 'CITIZEN'
  END
`;

const civicUserSelect = `
  id AS "civicUserId",
  name,
  email,
  role AS "rawRole",
  ${normalizedRoleSql} AS "normalizedRole",
  department,
  employee_code AS "employeeCode",
  gender,
  age,
  phone,
  status,
  date_of_birth::text AS "dateOfBirth",
  aadhar_number AS "aadharNumber",
  pan_number AS "panNumber",
  permanent_address AS "permanentAddress",
  pincode,
  category,
  profile_completed AS "profileCompleted",
  created_at::text AS "createdAt"
`;

const civicUserSelectWithPassword = `
  ${civicUserSelect},
  password
`;

export class CivicUsersRepository {
  async findUserByEmail(email: string, options: { includePassword?: boolean } = {}) {
    const pool = this.getPool();

    const { rows } = await pool.query<CivicUserRecord>(
      `
        SELECT
          ${options.includePassword ? civicUserSelectWithPassword : civicUserSelect}
        FROM public.users
        WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [email.trim()]
    );

    return rows[0] ?? null;
  }

  async listUsers(filters: {
    role?: CivicUserRole;
    department?: string;
    search?: string;
  } = {}) {
    const pool = this.getPool();
    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.role) {
      params.push(filters.role);
      where.push(`${normalizedRoleSql} = $${params.length}`);
    }

    if (filters.department?.trim()) {
      params.push(filters.department.trim());
      where.push(`COALESCE(department, '') ILIKE $${params.length}`);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      where.push(`
        (
          CAST(id AS TEXT) ILIKE $${params.length}
          OR COALESCE(name, '') ILIKE $${params.length}
          OR COALESCE(email, '') ILIKE $${params.length}
          OR COALESCE(phone, '') ILIKE $${params.length}
          OR COALESCE(employee_code, '') ILIKE $${params.length}
          OR COALESCE(department, '') ILIKE $${params.length}
        )
      `);
    }

    const { rows } = await pool.query<CivicUserRecord>(
      `
        SELECT
          ${civicUserSelect}
        FROM public.users
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC NULLS LAST, id DESC
      `,
      params
    );

    return rows;
  }

  async getUserCounts() {
    const pool = this.getPool();
    const { rows } = await pool.query<{
      totalUsers: string;
      totalCitizens: string;
      totalEmployees: string;
      totalAdmins: string;
    }>(`
      SELECT
        COUNT(*)::text AS "totalUsers",
        COUNT(*) FILTER (WHERE ${normalizedRoleSql} = 'CITIZEN')::text AS "totalCitizens",
        COUNT(*) FILTER (WHERE ${normalizedRoleSql} = 'EMPLOYEE')::text AS "totalEmployees",
        COUNT(*) FILTER (WHERE ${normalizedRoleSql} IN ('ADMIN', 'SUPER_ADMIN'))::text AS "totalAdmins"
      FROM public.users
    `);

    return {
      totalUsers: Number(rows[0]?.totalUsers ?? 0),
      totalCitizens: Number(rows[0]?.totalCitizens ?? 0),
      totalEmployees: Number(rows[0]?.totalEmployees ?? 0),
      totalAdmins: Number(rows[0]?.totalAdmins ?? 0)
    };
  }

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: CivicUserRole;
    phone?: string | null;
  }) {
    const pool = this.getPool();

    const { rows } = await pool.query<CivicUserRecord>(
      `
        INSERT INTO public.users (
          name,
          email,
          password,
          role,
          phone,
          created_at,
          profile_completed
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, false)
        RETURNING
          ${civicUserSelectWithPassword}
      `,
      [data.name.trim(), data.email.trim().toLowerCase(), data.passwordHash, data.role, data.phone ?? null]
    );

    return rows[0];
  }

  async updatePasswordHashById(civicUserId: number, passwordHash: string) {
    const pool = this.getPool();

    await pool.query(
      `
        UPDATE public.users
        SET password = $2
        WHERE id = $1
      `,
      [civicUserId, passwordHash]
    );
  }

  private getPool() {
    if (!civicPlatformPool) {
      throw new AppError(
        "Civic platform database is not configured",
        StatusCodes.SERVICE_UNAVAILABLE,
        "CIVIC_PLATFORM_DB_UNAVAILABLE"
      );
    }

    return civicPlatformPool;
  }
}
