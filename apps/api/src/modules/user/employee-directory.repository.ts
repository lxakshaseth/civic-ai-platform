import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";

import { employeeDirectoryPool } from "database/clients/employee-directory";
import { AppError } from "shared/errors/app-error";
import { getDepartmentAliases } from "utils/department-match";
import { isBcryptHash } from "utils/password";

export interface EmployeeDirectoryRecord {
  id: string;
  name: string | null;
  email: string | null;
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
  temporaryAddress: string | null;
  bankName: string | null;
  ifscCode: string | null;
  accountNumber: string | null;
  guardianName: string | null;
  relation: string | null;
  guardianPhone: string | null;
  pincode: string | null;
  category: string | null;
  createdAt: string | null;
  password?: string | null;
  hasPassword?: boolean;
  passwordStorage?: string | null;
}

export interface EmployeeDirectoryAuthRecord {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  phone: string | null;
  status: string | null;
  password: string | null;
  role: string | null;
}

export interface EmployeeDirectoryUpdateInput {
  name?: string | null;
  phone?: string | null;
  department?: string | null;
  category?: string | null;
  permanentAddress?: string | null;
  temporaryAddress?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  pincode?: string | null;
  passwordHash?: string | null;
}

export interface EmployeeDirectoryCreateInput {
  name: string;
  email?: string | null;
  passwordHash?: string | null;
  department?: string | null;
  employeeCode?: string | null;
  gender?: string | null;
  age?: number | null;
  phone?: string | null;
  status?: string | null;
  dateOfBirth?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
  permanentAddress?: string | null;
  temporaryAddress?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  accountNumber?: string | null;
  guardianName?: string | null;
  relation?: string | null;
  guardianPhone?: string | null;
  pincode?: string | null;
  category?: string | null;
  profileCompleted?: boolean;
}

export interface EmployeeDirectoryRegistryUpdateInput {
  name: string;
  phone: string;
  department?: string | null;
  status?: string | null;
  permanentAddress?: string | null;
  temporaryAddress?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  accountNumber?: string | null;
  guardianName?: string | null;
  relation?: string | null;
  guardianPhone?: string | null;
}

export type SafeEmployeeDirectoryRecord = Omit<EmployeeDirectoryRecord, "password"> & {
  hasPassword: boolean;
  passwordStorage: string;
  passwordSecurity: "missing" | "hashed" | "legacy-plaintext";
};

export function toSafeEmployeeDirectoryRecord(
  employee: EmployeeDirectoryRecord
): SafeEmployeeDirectoryRecord {
  const { password, ...safeEmployee } = employee;
  const normalizedPassword = password?.trim() ?? "";
  const hasPassword = Boolean(normalizedPassword);
  const passwordSecurity = !hasPassword
    ? "missing"
    : isBcryptHash(normalizedPassword)
      ? "hashed"
      : "legacy-plaintext";

  return {
    ...safeEmployee,
    hasPassword,
    passwordStorage:
      passwordSecurity === "hashed"
        ? "Stored securely (hashed)"
        : passwordSecurity === "legacy-plaintext"
          ? "Legacy plaintext detected in DB"
          : "Not set",
    passwordSecurity,
  };
}

const employeeDirectoryBaseSelect = `
  id::text AS id,
  name,
  email,
  department,
  employee_code AS "employeeCode",
  gender,
  age,
  phone,
  status,
  NULL::text AS "dateOfBirth",
  NULL::text AS "aadharNumber",
  NULL::text AS "panNumber",
  NULL::text AS "permanentAddress",
  NULL::text AS "temporaryAddress",
  NULL::text AS "bankName",
  NULL::text AS "ifscCode",
  NULL::text AS "accountNumber",
  NULL::text AS "guardianName",
  NULL::text AS relation,
  NULL::text AS "guardianPhone",
  pincode,
  NULL::text AS category,
  created_at::text AS "createdAt"
`;

const employeeDirectoryDetailSelect = `
  ${employeeDirectoryBaseSelect},
  password
`;

const normalizedDepartmentSql = `
  BTRIM(
    LOWER(
      REGEXP_REPLACE(
        REPLACE(COALESCE(department, ''), '&', ' and '),
        '[^a-zA-Z0-9]+',
        ' ',
        'g'
      )
    )
  )
`;

export class EmployeeDirectoryRepository {
  async listEmployees(filters: {
    department?: string;
    search?: string;
    status?: string;
  } = {}) {
    const pool = this.getPool();

    const params: unknown[] = [];
    const where: string[] = [];

    if (filters.department?.trim()) {
      params.push(getDepartmentAliases(filters.department));
      where.push(`${normalizedDepartmentSql} = ANY($${params.length}::text[])`);
    }

    if (filters.status?.trim()) {
      params.push(filters.status.trim());
      where.push(`status ILIKE $${params.length}`);
    }

    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      const i = params.length;

      where.push(`
        (
          CAST(id AS TEXT) ILIKE $${i}
          OR COALESCE(name, '') ILIKE $${i}
          OR COALESCE(email, '') ILIKE $${i}
          OR COALESCE(phone, '') ILIKE $${i}
          OR COALESCE(employee_code, '') ILIKE $${i}
        )
      `);
    }

    const query = `
      SELECT
        ${employeeDirectoryBaseSelect}
      FROM public.employees
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC NULLS LAST, id DESC
    `;

    const { rows } = await pool.query<EmployeeDirectoryRecord>(query, params);
    return rows;
  }

  async findEmployeeById(id: string, options: { includePassword?: boolean } = {}) {
    const pool = this.getPool();

    if (!id?.trim()) {
      throw new AppError(
        "Invalid employee ID",
        StatusCodes.BAD_REQUEST,
        "INVALID_EMPLOYEE_ID"
      );
    }

    const query = `
      SELECT
        ${options.includePassword ? employeeDirectoryDetailSelect : employeeDirectoryBaseSelect}
      FROM public.employees
      WHERE id = $1::uuid
      LIMIT 1
    `;

    const { rows } = await pool.query<EmployeeDirectoryRecord>(query, [id]);

    if (!rows.length) {
      throw new AppError(
        "Employee not found",
        StatusCodes.NOT_FOUND,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    return rows[0];
  }

  async findEmployeeAuthByEmail(email: string) {
    const pool = this.getPool();

    const query = `
      SELECT
        id::text AS id,
        name,
        email,
        department,
        phone,
        status,
        password,
        'EMPLOYEE' AS role
      FROM public.employees
      WHERE LOWER(COALESCE(email, '')) = LOWER($1)
      LIMIT 1
    `;

    const { rows } = await pool.query<EmployeeDirectoryAuthRecord>(query, [email.trim()]);
    return rows[0] ?? null;
  }

  async updatePasswordHashById(id: string, passwordHash: string) {
    const pool = this.getPool();

    await pool.query(
      `
        UPDATE public.employees
        SET
          password = $2
        WHERE id = $1::uuid
      `,
      [id, passwordHash]
    );
  }

  async updateEmployee(id: string, data: EmployeeDirectoryUpdateInput) {
    const pool = this.getPool();

    const updates: string[] = [];
    const params: unknown[] = [id];

    const pushUpdate = (column: string, value: unknown) => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    if (data.name !== undefined) {
      pushUpdate("name", data.name);
    }
    if (data.phone !== undefined) {
      pushUpdate("phone", data.phone);
    }
    if (data.department !== undefined) {
      pushUpdate("department", data.department);
    }
    if (data.pincode !== undefined) {
      pushUpdate("pincode", data.pincode);
    }
    if (data.passwordHash !== undefined) {
      pushUpdate("password", data.passwordHash);
    }

    if (!updates.length) {
      throw new AppError(
        "At least one editable field is required",
        StatusCodes.BAD_REQUEST,
        "EMPLOYEE_UPDATE_EMPTY"
      );
    }

    const query = `
      UPDATE public.employees
      SET ${updates.join(", ")}
      WHERE id = $1::uuid
      RETURNING ${employeeDirectoryBaseSelect}
    `;

    const { rows } = await pool.query<EmployeeDirectoryRecord>(query, params);

    if (!rows.length) {
      throw new AppError(
        "Employee not found",
        StatusCodes.NOT_FOUND,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    return rows[0];
  }

  async updateEmployeeRegistry(id: string, data: EmployeeDirectoryRegistryUpdateInput) {
    const pool = this.getPool();

    const query = `
      UPDATE public.employees
      SET
        name = $1,
        phone = $2,
        department = $3,
        status = $4
      WHERE id = $5::uuid
      RETURNING ${employeeDirectoryDetailSelect}
    `;

    const params = [
      data.name,
      data.phone,
      data.department ?? null,
      data.status ?? null,
      id
    ];

    const { rows } = await pool.query<EmployeeDirectoryRecord>(query, params);

    if (!rows.length) {
      throw new AppError(
        "Employee not found",
        StatusCodes.NOT_FOUND,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    return rows[0];
  }

  async createEmployee(data: EmployeeDirectoryCreateInput) {
    const pool = this.getPool();
    const employeeId = uuid();

    const { rows } = await pool.query<EmployeeDirectoryRecord>(
      `
        WITH next_employee_code AS (
          SELECT
            COALESCE(
              $3,
              CONCAT(
                'EMP-',
                TO_CHAR(CURRENT_DATE, 'YYYY'),
                '-',
                LPAD((COUNT(*) + 1)::text, 4, '0')
              )
            ) AS employee_code
          FROM public.employees
        )
        INSERT INTO public.employees (
          id,
          name,
          email,
          password,
          department,
          employee_code,
          gender,
          age,
          phone,
          status,
          pincode,
          created_at
        )
        SELECT
          $11,
          $1,
          $2,
          $4,
          $5,
          next_employee_code.employee_code,
          $6,
          $7,
          $8,
          $9,
          $10,
          CURRENT_TIMESTAMP
        FROM next_employee_code
        RETURNING ${employeeDirectoryBaseSelect}
      `,
      [
        data.name,
        data.email ?? null,
        data.employeeCode ?? null,
        data.passwordHash ?? null,
        data.department ?? null,
        data.gender ?? null,
        data.age ?? null,
        data.phone ?? null,
        data.status ?? "Active",
        data.pincode ?? null,
        employeeId
      ]
    );

    return rows[0];
  }

  private getPool() {
    if (!employeeDirectoryPool) {
      throw new AppError(
        "Employee directory database is not configured",
        StatusCodes.SERVICE_UNAVAILABLE,
        "EMPLOYEE_DIRECTORY_UNAVAILABLE"
      );
    }

    return employeeDirectoryPool;
  }
}
