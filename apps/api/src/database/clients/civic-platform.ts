import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

import { env } from "config/env";
import { logger } from "utils/logger";

const globalForCivicPlatform = globalThis as unknown as {
  civicPlatformPool?: Pool;
  civicPlatformSchemaPromise?: Promise<void>;
};

function resolveCivicPlatformDatabaseUrl() {
  // 🔥 ALWAYS USE SAME DB AS PRISMA
  return env.DATABASE_URL;
}

function resolveCivicPlatformPoolConfig(): PoolConfig | null {
  const databaseUrl = resolveCivicPlatformDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const isLocalDatabase = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
    const sslMode = parsedUrl.searchParams.get("sslmode");
    const shouldUseSsl = !isLocalDatabase && sslMode !== "disable";

    return {
      host: parsedUrl.hostname || env.CIVIC_PLATFORM_DB_HOST || "",
      port: parsedUrl.port ? Number(parsedUrl.port) : env.CIVIC_PLATFORM_DB_PORT || 5432,
      user: decodeURIComponent(parsedUrl.username) || env.CIVIC_PLATFORM_DB_USER || "",
      password: decodeURIComponent(parsedUrl.password) || env.CIVIC_PLATFORM_DB_PASSWORD,
      database: parsedUrl.pathname.replace(/^\//, "") || env.CIVIC_PLATFORM_DB_NAME || "",
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
    };
  } catch (error) {
    logger.error({ error }, "DATABASE_URL is invalid. PostgreSQL client will stay disabled.");
    return null;
  }
}

const civicPlatformPoolConfig = resolveCivicPlatformPoolConfig();

export const civicPlatformPool =
  civicPlatformPoolConfig
    ? globalForCivicPlatform.civicPlatformPool ?? new Pool(civicPlatformPoolConfig)
    : null;

if (civicPlatformPool) {
  civicPlatformPool.on("error", (error) => {
    logger.error({ error }, "PostgreSQL pool emitted an unexpected error");
  });
}

if (civicPlatformPool && env.NODE_ENV !== "production") {
  globalForCivicPlatform.civicPlatformPool = civicPlatformPool;
}

export async function queryCivicPlatform<TRow extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  retries = 1
) {
  if (!civicPlatformPool) {
    throw new Error("Civic platform database is not configured");
  }

  try {
    return await civicPlatformPool.query<TRow>(text, params);
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    const canRetry =
      retries > 0 && ["57P01", "57P02", "ECONNRESET", "ECONNREFUSED"].includes(errorCode);

    if (canRetry) {
      logger.warn({ errorCode, retries }, "Retrying PostgreSQL query after transient failure");
      return queryCivicPlatform<TRow>(text, params, retries - 1);
    }

    throw error;
  }
}

export async function withCivicPlatformTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  if (!civicPlatformPool) {
    throw new Error("Civic platform database is not configured");
  }

  const client = await civicPlatformPool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const bootstrapStatements = [
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'CITIZEN'`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_code TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age INTEGER`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language VARCHAR(16) DEFAULT 'en'`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE'`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permanent_address TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS temporary_address TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhar_number TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pan_number TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS category TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ifsc_code TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_number TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS guardian_name TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS relation TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS guardian_phone TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_sanitary_feature BOOLEAN DEFAULT false`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS citizen_id UUID`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS citizen_name TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS upi_id TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'pending'`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS transaction_id TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS invoice_number TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS vendor_name TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS bill_file_path TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS review_note TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS fraud_reason TEXT`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.sanitary_reimbursement_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS title TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS issue_type TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS urgency_score INTEGER`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS structured_address JSONB`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS category VARCHAR(120)`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS department VARCHAR(120)`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS citizen_id UUID`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS assigned_employee_id UUID`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS priority VARCHAR(32) DEFAULT 'MEDIUM'`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS location_address TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7)`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7)`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS image_url TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMP WITHOUT TIME ZONE`,
  `ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS complaint_id UUID`,
  `ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS employee_uuid UUID`,
  `ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assigned_by_uuid UUID`,
  `ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS note TEXT`,
  `ALTER TABLE public.proofs ADD COLUMN IF NOT EXISTS proof_type VARCHAR(32) DEFAULT 'AFTER'`,
  `ALTER TABLE public.proofs ADD COLUMN IF NOT EXISTS note TEXT`,
  `ALTER TABLE public.proofs ADD COLUMN IF NOT EXISTS file_name TEXT`,
  `ALTER TABLE public.proofs ADD COLUMN IF NOT EXISTS mime_type TEXT`,
  `ALTER TABLE public.proofs ADD COLUMN IF NOT EXISTS uploaded_by UUID`,
  `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT`,
  `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB`,
  `ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS complaint_id UUID`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS sender_id UUID`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS receiver_id UUID`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS translated_message TEXT`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS language VARCHAR(16) DEFAULT 'en'`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS translated_language VARCHAR(16)`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_url TEXT`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_mime_type TEXT`,
  `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_duration_ms INTEGER`,
  `ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS complaint_id UUID`,
  `ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS citizen_uuid UUID`
];

const bootstrapDoStatements = [
  `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_email_key'
      ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_email_key UNIQUE (email);
      END IF;
    END
    $$;
  `,
  `
    CREATE INDEX IF NOT EXISTS complaints_citizen_id_idx
    ON public.complaints (citizen_id, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS complaints_assigned_employee_id_idx
    ON public.complaints (assigned_employee_id, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS complaints_status_idx
    ON public.complaints (status, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS complaints_pincode_idx
    ON public.complaints (pincode);
  `,
  `
    CREATE INDEX IF NOT EXISTS assignments_complaint_id_idx
    ON public.assignments (complaint_id, assigned_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS proofs_assignment_id_idx
    ON public.proofs (assignment_id, uploaded_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS tickets_complaint_id_idx
    ON public.tickets (complaint_id, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS tickets_raised_by_idx
    ON public.tickets (raised_by, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS notifications_user_id_idx
    ON public.notifications (user_id, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS comments_complaint_id_idx
    ON public.comments (complaint_id, created_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS ratings_complaint_id_idx
    ON public.ratings (complaint_id, created_at DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS public.sanitary_reimbursement_requests (
      id TEXT PRIMARY KEY,
      citizen_id UUID,
      citizen_name TEXT,
      upi_id TEXT,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      transaction_id TEXT,
      invoice_number TEXT,
      vendor_name TEXT,
      bill_file_path TEXT,
      review_note TEXT,
      fraud_reason TEXT,
      applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP WITHOUT TIME ZONE,
      paid_at TIMESTAMP WITHOUT TIME ZONE,
      rejected_at TIMESTAMP WITHOUT TIME ZONE,
      flagged_at TIMESTAMP WITHOUT TIME ZONE,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS sanitary_reimbursement_status_idx
    ON public.sanitary_reimbursement_requests (status, applied_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS sanitary_reimbursement_citizen_idx
    ON public.sanitary_reimbursement_requests (citizen_id, applied_at DESC);
  `,
  `
    CREATE INDEX IF NOT EXISTS sanitary_reimbursement_upi_idx
    ON public.sanitary_reimbursement_requests (upi_id, applied_at DESC);
  `
];

export async function ensureCivicPlatformSchema() {
  if (!civicPlatformPool) {
    logger.warn("Skipping PostgreSQL schema bootstrap because DATABASE_URL is invalid or missing.");
    return;
  }

  for (const statement of bootstrapStatements) {
    await civicPlatformPool.query(statement);
  }

  for (const statement of bootstrapDoStatements) {
    await civicPlatformPool.query(statement);
  }

  await civicPlatformPool.query(`
    UPDATE public.users
    SET
      role = COALESCE(NULLIF(BTRIM(role), ''), 'CITIZEN'),
      language = COALESCE(NULLIF(BTRIM(language), ''), 'en'),
      status = COALESCE(NULLIF(BTRIM(status), ''), 'ACTIVE'),
      show_sanitary_feature = COALESCE(show_sanitary_feature, false),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
  `);

  await civicPlatformPool.query(`
    UPDATE public.complaints
    SET
      status = COALESCE(NULLIF(BTRIM(status), ''), 'OPEN'),
      priority = COALESCE(NULLIF(BTRIM(priority), ''), 'MEDIUM'),
      issue_type = COALESCE(NULLIF(BTRIM(issue_type), ''), NULLIF(BTRIM(category), ''), 'General civic issue'),
      urgency_score = COALESCE(
        urgency_score,
        CASE
          WHEN LOWER(COALESCE(priority, 'medium')) = 'high' THEN 85
          WHEN LOWER(COALESCE(priority, 'medium')) = 'low' THEN 54
          ELSE 68
        END
      ),
      tags = COALESCE(tags, ARRAY[]::TEXT[]),
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
  `);

  await civicPlatformPool.query(`
    UPDATE public.notifications
    SET
      title = COALESCE(NULLIF(BTRIM(title), ''), 'Platform update'),
      is_read = COALESCE(is_read, false),
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
  `);

  await civicPlatformPool.query(`
    UPDATE public.sanitary_reimbursement_requests
    SET
      citizen_name = COALESCE(NULLIF(BTRIM(citizen_name), ''), 'Citizen'),
      status = LOWER(COALESCE(NULLIF(BTRIM(status), ''), 'pending')),
      amount = COALESCE(amount, 0),
      applied_at = COALESCE(applied_at, created_at, CURRENT_TIMESTAMP),
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
  `);
}

export function ensureCivicPlatformSchemaReady() {
  if (!globalForCivicPlatform.civicPlatformSchemaPromise) {
    globalForCivicPlatform.civicPlatformSchemaPromise = ensureCivicPlatformSchema().catch(
      (error) => {
        globalForCivicPlatform.civicPlatformSchemaPromise = undefined;
        throw error;
      }
    );
  }

  return globalForCivicPlatform.civicPlatformSchemaPromise;
}
