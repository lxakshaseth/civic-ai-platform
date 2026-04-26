import {
  clearAuthSession,
  isJwtExpired,
  readAuthSession,
  type SessionUser,
  writeAuthSession,
} from "./session";

type QueryValue = string | number | boolean | null | undefined;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  token?: string | null;
  query?: Record<string, QueryValue>;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  details?: unknown;
  errors?: unknown;
};

type AuthPayload = {
  user: Omit<SessionUser, "portalRole">;
  accessToken: string;
  refreshToken?: string | null;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_API_BASE_URL = "https://civic-ai-platform-5.onrender.com/api";
const AUTH_REFRESH_BUFFER_MS = 30_000;
const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  "/auth/login",
  "/auth/logout",
  "/auth/refresh",
  "/auth/register",
]);

let refreshInFlight: Promise<string | null> | null = null;

function getApiBaseUrl() {
  const configuredBaseUrl =
    process.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
    DEFAULT_API_BASE_URL;

  if (/\/api(?:\/v\d+)?$/i.test(configuredBaseUrl)) {
    return configuredBaseUrl.replace(/\/api\/v\d+$/i, "/api");
  }

  return `${configuredBaseUrl}/api`;
}

function normalizeApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = normalizeApiPath(path);
  const url = new URL(`${getApiBaseUrl()}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function buildRequestBody(body?: ApiRequestOptions["body"]) {
  if (body == null) {
    return undefined;
  }

  if (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

function getFirstValidationMessage(errors: unknown) {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  const flattenedErrors = errors as {
    formErrors?: unknown;
    fieldErrors?: Record<string, unknown>;
  };

  if (Array.isArray(flattenedErrors.formErrors)) {
    const firstFormError = flattenedErrors.formErrors.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );

    if (firstFormError) {
      return firstFormError;
    }
  }

  const fieldErrors = flattenedErrors.fieldErrors;

  if (!fieldErrors || typeof fieldErrors !== "object") {
    return null;
  }

  for (const messages of Object.values(fieldErrors)) {
    if (!Array.isArray(messages)) {
      continue;
    }

    const firstFieldError = messages.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );

    if (firstFieldError) {
      return firstFieldError;
    }
  }

  return null;
}

function shouldAttemptSessionRefresh(path: string, token?: string | null) {
  return !token && !AUTH_REFRESH_EXCLUDED_PATHS.has(normalizeApiPath(path));
}

async function parseApiResponse<T>(response: Response) {
  const rawPayload = await response.text();
  let parsedPayload: ApiResponse<T> | null = null;

  if (rawPayload) {
    try {
      parsedPayload = JSON.parse(rawPayload) as ApiResponse<T>;
    } catch {
      parsedPayload = null;
    }
  }

  return parsedPayload;
}

async function refreshAuthSession() {
  const session = readAuthSession();

  if (!session) {
    return null;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          session.refreshToken ? { refreshToken: session.refreshToken } : {}
        ),
      });
      const parsedPayload = await parseApiResponse<AuthPayload>(response);

      if (!response.ok || !parsedPayload?.data?.accessToken || !parsedPayload.data.user) {
        clearAuthSession();
        return null;
      }

      const refreshedSession = writeAuthSession({
        ...parsedPayload.data,
        refreshToken: parsedPayload.data.refreshToken ?? session.refreshToken ?? null,
      });

      return refreshedSession.accessToken;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const requestBody = buildRequestBody(options.body);
  const requestUrl = buildUrl(path, options.query);
  const canRefreshSession = shouldAttemptSessionRefresh(path, options.token);

  const sendRequest = async (tokenOverride?: string | null) => {
    const headers = new Headers(options.headers);
    const session = readAuthSession();
    let requestToken = tokenOverride ?? options.token ?? session?.accessToken ?? null;

    if (
      canRefreshSession &&
      requestToken &&
      isJwtExpired(requestToken, AUTH_REFRESH_BUFFER_MS)
    ) {
      requestToken = (await refreshAuthSession()) ?? readAuthSession()?.accessToken ?? null;
    }

    headers.set("Accept", "application/json");

    if (requestToken) {
      headers.set("Authorization", `Bearer ${requestToken}`);
    }

    if (requestBody && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const response = await fetch(requestUrl, {
        ...options,
        body: requestBody,
        credentials: options.credentials ?? "include",
        headers,
      });

      const parsedPayload = await parseApiResponse<T>(response);
      return { response, parsedPayload };
    } catch (error) {
      throw new ApiError(
        `Unable to reach the SAIP API at ${getApiBaseUrl()}.`,
        503,
        "API_UNREACHABLE",
        error
      );
    }
  };

  let { response, parsedPayload } = await sendRequest();

  if (response.status === 401 && canRefreshSession && readAuthSession()) {
    const refreshedToken = await refreshAuthSession();

    if (refreshedToken) {
      ({ response, parsedPayload } = await sendRequest(refreshedToken));
    } else {
      clearAuthSession();
    }
  }

  if (!response.ok) {
    if (response.status === 401 && readAuthSession()) {
      clearAuthSession();
    }

    const validationMessage = getFirstValidationMessage(parsedPayload?.errors);

    throw new ApiError(
      validationMessage || parsedPayload?.message || "Unable to complete the request.",
      response.status,
      parsedPayload?.code,
      parsedPayload?.details ?? parsedPayload?.errors
    );
  }

  return parsedPayload?.data as T;
}
