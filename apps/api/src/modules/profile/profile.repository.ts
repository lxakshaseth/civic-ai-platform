import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { civicPlatformPool } from "database/clients/civic-platform";
import { AppError } from "shared/errors/app-error";

export interface CivicUserProfileRecord {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  employeeCode: string | null;
  gender: string | null;
  age: number | null;
  phone: string | null;
  language: string | null;
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
  showSanitaryFeature: boolean | null;
  profileCompleted: boolean | null;
}

export interface CivicUserProfileUpsertInput {
  name?: string | null;
  email: string;
  role?: string | null;
  phone?: string | null;
  language?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  permanentAddress?: string | null;
  pincode?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
  showSanitaryFeature?: boolean | null;
  profileCompleted?: boolean;
}

const civicUserSelect = `
  id,
  name,
  email,
  role,
  department,
  employee_code AS "employeeCode",
  gender,
  age,
  phone,
  language,
  status,
  date_of_birth::text AS "dateOfBirth",
  aadhar_number AS "aadharNumber",
  pan_number AS "panNumber",
  permanent_address AS "permanentAddress",
  temporary_address AS "temporaryAddress",
  bank_name AS "bankName",
  ifsc_code AS "ifscCode",
  account_number AS "accountNumber",
  guardian_name AS "guardianName",
  relation,
  guardian_phone AS "guardianPhone",
  pincode,
  category,
  created_at::text AS "createdAt",
  show_sanitary_feature AS "showSanitaryFeature",
  profile_completed AS "profileCompleted"
`;

function normalizeRole(role?: UserRole | string | null) {
  if (!role) {
    return null;
  }

  return role.toString().trim().toUpperCase();
}

export class ProfileRepository {
  async findByEmail(email: string) {
    const pool = this.getPool();
    const { rows } = await pool.query<CivicUserProfileRecord>(
      `
        SELECT
          ${civicUserSelect}
        FROM public.users
        WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        LIMIT 1
      `,
      [email.trim()]
    );

    return rows[0] ?? null;
  }

  async ensureAuthUserRow(data: {
    email: string;
    name?: string | null;
    role?: UserRole | string | null;
    phone?: string | null;
    language?: string | null;
  }) {
    const pool = this.getPool();
    const normalizedEmail = data.email.trim();
    const normalizedName = data.name?.trim() || normalizedEmail.split("@")[0] || "Citizen";
    const normalizedRole = normalizeRole(data.role) ?? "CITIZEN";
    const normalizedPhone = data.phone?.trim() || null;
    const normalizedLanguage = data.language?.trim().toLowerCase() || "en";

    const { rows } = await pool.query<CivicUserProfileRecord>(
      `
        INSERT INTO public.users (
          name,
          email,
          role,
          phone,
          language,
          show_sanitary_feature,
          created_at,
          profile_completed
        )
        VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP, false)
        ON CONFLICT (email) DO UPDATE
        SET
          name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
          role = COALESCE(NULLIF(EXCLUDED.role, ''), public.users.role),
          phone = COALESCE(public.users.phone, EXCLUDED.phone),
          language = COALESCE(NULLIF(public.users.language, ''), EXCLUDED.language, 'en')
        RETURNING
          ${civicUserSelect}
      `,
      [normalizedName, normalizedEmail, normalizedRole, normalizedPhone, normalizedLanguage]
    );

    return rows[0];
  }

  async hasVerifiedFieldConflict(input: {
    email: string;
    aadharNumber?: string | null;
    panNumber?: string | null;
  }) {
    const pool = this.getPool();
    const normalizedAadhar = input.aadharNumber?.trim() || null;
    const normalizedPan = input.panNumber?.trim().toUpperCase() || null;

    if (!normalizedAadhar && !normalizedPan) {
      return false;
    }

    const params: unknown[] = [input.email.trim()];
    const conditions: string[] = [];

    if (normalizedAadhar) {
      params.push(normalizedAadhar);
      conditions.push(`LOWER(COALESCE(aadhar_number, '')) = LOWER($${params.length})`);
    }

    if (normalizedPan) {
      params.push(normalizedPan);
      conditions.push(`LOWER(COALESCE(pan_number, '')) = LOWER($${params.length})`);
    }

    const { rows } = await pool.query<{ exists: boolean }>(
      `
        SELECT true AS exists
        FROM public.users
        WHERE LOWER(COALESCE(email, '')) <> LOWER($1)
          AND (${conditions.join(" OR ")})
        LIMIT 1
      `,
      params
    );

    return Boolean(rows[0]?.exists);
  }

  async upsertProfileByEmail(input: CivicUserProfileUpsertInput) {
    const pool = this.getPool();
    const params = [
      input.email.trim(),
      input.name?.trim() || null,
      normalizeRole(input.role),
      input.phone?.trim() || null,
      input.language?.trim().toLowerCase() || null,
      input.gender?.trim() || null,
      input.dateOfBirth?.trim() || null,
      input.permanentAddress?.trim() || null,
      input.pincode?.trim() || null,
      input.aadharNumber?.trim() || null,
      input.panNumber?.trim().toUpperCase() || null,
      input.showSanitaryFeature ?? null,
      input.profileCompleted ?? false
    ];

    const { rows } = await pool.query<CivicUserProfileRecord>(
      `
        INSERT INTO public.users (
          email,
          name,
          role,
          phone,
          language,
          gender,
          date_of_birth,
          permanent_address,
          pincode,
          aadhar_number,
          pan_number,
          show_sanitary_feature,
          created_at,
          profile_completed
        )
        VALUES (
          $1,
          COALESCE($2, SPLIT_PART($1, '@', 1)),
          COALESCE($3, 'CITIZEN'),
          $4,
          $5,
          $6,
          CASE WHEN $7 IS NULL THEN NULL ELSE $7::date END,
          $8,
          $9,
          $10,
          $11,
          $12,
          CURRENT_TIMESTAMP,
          $13
        )
        ON CONFLICT (email) DO UPDATE
        SET
          name = COALESCE(EXCLUDED.name, public.users.name),
          role = COALESCE(EXCLUDED.role, public.users.role),
          phone = COALESCE(EXCLUDED.phone, public.users.phone),
          language = COALESCE(EXCLUDED.language, public.users.language, 'en'),
          gender = COALESCE(EXCLUDED.gender, public.users.gender),
          date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.users.date_of_birth),
          permanent_address = COALESCE(EXCLUDED.permanent_address, public.users.permanent_address),
          pincode = COALESCE(EXCLUDED.pincode, public.users.pincode),
          aadhar_number = COALESCE(EXCLUDED.aadhar_number, public.users.aadhar_number),
          pan_number = COALESCE(EXCLUDED.pan_number, public.users.pan_number),
          show_sanitary_feature = COALESCE(EXCLUDED.show_sanitary_feature, public.users.show_sanitary_feature),
          profile_completed = EXCLUDED.profile_completed
        RETURNING
          ${civicUserSelect}
      `,
      params
    );

    return rows[0];
  }

  async updateProfileByEmail(
    email: string,
    input: {
      phone?: string | null;
      language?: string | null;
      permanentAddress?: string | null;
      pincode?: string | null;
      showSanitaryFeature?: boolean | null;
      profileCompleted?: boolean;
    }
  ) {
    const pool = this.getPool();
    const updates: string[] = [];
    const params: unknown[] = [email.trim()];

    if (input.phone !== undefined) {
      params.push(input.phone?.trim() || null);
      updates.push(`phone = $${params.length}`);
    }

    if (input.language !== undefined) {
      params.push(input.language?.trim().toLowerCase() || "en");
      updates.push(`language = $${params.length}`);
    }

    if (input.permanentAddress !== undefined) {
      params.push(input.permanentAddress?.trim() || null);
      updates.push(`permanent_address = $${params.length}`);
    }

    if (input.pincode !== undefined) {
      params.push(input.pincode?.trim() || null);
      updates.push(`pincode = $${params.length}`);
    }

    if (input.showSanitaryFeature !== undefined) {
      params.push(input.showSanitaryFeature);
      updates.push(`show_sanitary_feature = $${params.length}`);
    }

    if (input.profileCompleted !== undefined) {
      params.push(input.profileCompleted);
      updates.push(`profile_completed = $${params.length}`);
    }

    if (!updates.length) {
      throw new AppError(
        "At least one profile field is required",
        StatusCodes.BAD_REQUEST,
        "PROFILE_UPDATE_EMPTY"
      );
    }

    const { rows } = await pool.query<CivicUserProfileRecord>(
      `
        UPDATE public.users
        SET ${updates.join(", ")}
        WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        RETURNING
          ${civicUserSelect}
      `,
      params
    );

    return rows[0] ?? null;
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
