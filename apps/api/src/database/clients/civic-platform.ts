import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

import { env } from "config/env";
import { logger } from "utils/logger";

const globalForCivicPlatform = globalThis as unknown as {
  civicPlatformPool?: Pool;
};

function resolveCivicPlatformDatabaseUrl() {
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

export async function ensureCivicPlatformSchema() {
  logger.info("Legacy civic platform schema bootstrap is disabled");
}

export function ensureCivicPlatformSchemaReady() {
  return Promise.resolve();
}
