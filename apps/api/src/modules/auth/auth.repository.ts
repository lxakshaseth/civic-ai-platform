import { UserRole } from "@prisma/client";

import { queryCivicPlatform } from "database/clients/civic-platform";

export type AuthUserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  departmentId: string | null;
  isActive: boolean;
  passwordHash: string | null;
  language: string | null;
  gender: string | null;
  showSanitaryFeature: boolean | null;
  profileCompleted: boolean;
  refreshTokenHash: string | null;
};

const authUserSelect = `
  id,
  COALESCE(NULLIF(BTRIM(name), ''), SPLIT_PART(COALESCE(email, ''), '@', 1), 'User') AS "fullName",
  COALESCE(email, '') AS email,
  phone,
  CASE
    WHEN UPPER(COALESCE(role, '')) = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
    WHEN UPPER(COALESCE(role, '')) IN ('ADMIN', 'DEPARTMENT_ADMIN') THEN 'DEPARTMENT_ADMIN'
    WHEN UPPER(COALESCE(role, '')) = 'EMPLOYEE' THEN 'EMPLOYEE'
    ELSE 'CITIZEN'
  END AS role,
  NULLIF(BTRIM(department), '') AS "departmentId",
  CASE
    WHEN LOWER(COALESCE(status, 'ACTIVE')) IN ('inactive', 'disabled', 'terminated', 'blocked')
      THEN false
    ELSE true
  END AS "isActive",
  password AS "passwordHash",
  language,
  gender,
  show_sanitary_feature AS "showSanitaryFeature",
  COALESCE(profile_completed, false) AS "profileCompleted",
  refresh_token_hash AS "refreshTokenHash"
`;

export class AuthRepository {
  async findUserByEmail(email: string) {
    const result = await queryCivicPlatform<AuthUserRecord>(
      `
        SELECT ${authUserSelect}
        FROM public.users
        WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        LIMIT 1
      `,
      [email.trim()]
    );

    return result.rows[0] ?? null;
  }

  async findUserByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.trim();
    const result = await queryCivicPlatform<AuthUserRecord>(
      `
        SELECT ${authUserSelect}
        FROM public.users
        WHERE
          LOWER(COALESCE(email, '')) = LOWER($1)
          OR UPPER(COALESCE(employee_code, '')) = UPPER($1)
          OR CAST(id AS TEXT) = $1
        LIMIT 1
      `,
      [normalizedIdentifier]
    );

    return result.rows[0] ?? null;
  }

  async findUserByPhone(phone: string) {
    const result = await queryCivicPlatform<AuthUserRecord>(
      `
        SELECT ${authUserSelect}
        FROM public.users
        WHERE phone = $1
        LIMIT 1
      `,
      [phone.trim()]
    );

    return result.rows[0] ?? null;
  }

  async findUserById(id: string) {
    const result = await queryCivicPlatform<AuthUserRecord>(
      `
        SELECT ${authUserSelect}
        FROM public.users
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  updatePasswordHash(userId: string, passwordHash: string) {
    return queryCivicPlatform(
      `
        UPDATE public.users
        SET
          password = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [userId, passwordHash]
    );
  }

  async createUser(data: {
    fullName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN";
  }) {
    const normalizedRole =
      data.role === UserRole.DEPARTMENT_ADMIN ? "ADMIN" : data.role;
    const result = await queryCivicPlatform<AuthUserRecord>(
      `
        INSERT INTO public.users (
          name,
          email,
          phone,
          password,
          role,
          language,
          status,
          created_at,
          updated_at,
          profile_completed
        )
        VALUES ($1, $2, $3, $4, $5, 'en', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
        RETURNING ${authUserSelect}
      `,
      [
        data.fullName.trim(),
        data.email.trim().toLowerCase(),
        data.phone?.trim() || null,
        data.passwordHash,
        normalizedRole
      ]
    );

    return result.rows[0];
  }

  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    void data.expiresAt;

    return queryCivicPlatform(
      `
        UPDATE public.users
        SET
          refresh_token_hash = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [data.userId, data.tokenHash]
    );
  }

  async findRefreshToken(tokenHash: string) {
    const result = await queryCivicPlatform<{
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }>(
      `
        SELECT
          id AS "userId",
          refresh_token_hash AS "tokenHash",
          CURRENT_TIMESTAMP + INTERVAL '7 days' AS "expiresAt"
        FROM public.users
        WHERE refresh_token_hash = $1
        LIMIT 1
      `,
      [tokenHash]
    );

    return result.rows[0] ?? null;
  }

  revokeRefreshToken(id: string) {
    return queryCivicPlatform(
      `
        UPDATE public.users
        SET
          refresh_token_hash = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [id]
    );
  }

  revokeActiveRefreshTokensByUserId(userId: string) {
    return this.revokeRefreshToken(userId);
  }
}
