export type PortalRole = "public" | "employee" | "admin";

export type ApiUserRole =
  | "CITIZEN"
  | "EMPLOYEE"
  | "DEPARTMENT_ADMIN"
  | "SUPER_ADMIN";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: ApiUserRole;
  departmentId?: string | null;
  gender?: string | null;
  language?: string;
  profileCompleted?: boolean;
  showSanitaryFeature?: boolean;
  portalRole: PortalRole;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
  token?: string | null;
  user: SessionUser;
  validatedAt?: number;
};

const AUTH_SESSION_KEY = "saip_auth_session";

export const AUTH_CHANGE_EVENT = "saip:auth-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = `${normalizedValue}${"=".repeat(paddingLength)}`;

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(paddedValue);
  }

  return Buffer.from(paddedValue, "base64").toString("utf-8");
}

export function getPortalRoleForUserRole(role: ApiUserRole): PortalRole {
  if (role === "EMPLOYEE") {
    return "employee";
  }

  if (role === "DEPARTMENT_ADMIN" || role === "SUPER_ADMIN") {
    return "admin";
  }

  return "public";
}

export function normalizeSessionUser(
  user: Omit<SessionUser, "portalRole"> & { portalRole?: PortalRole }
): SessionUser {
  return {
    ...user,
    departmentId: user.departmentId ?? null,
    portalRole: user.portalRole ?? getPortalRoleForUserRole(user.role),
  };
}

export function dispatchAuthChanged() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function readAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const storedSession = window.localStorage.getItem(AUTH_SESSION_KEY);

    if (!storedSession) {
      return null;
    }

    const parsedSession = JSON.parse(storedSession) as AuthSession;

    if (!parsedSession?.accessToken || !parsedSession?.user) {
      return null;
    }

    return {
      ...parsedSession,
      user: normalizeSessionUser(parsedSession.user),
    };
  } catch (error) {
    console.error("Unable to read auth session", error);
    return null;
  }
}

export function writeAuthSession(
  session: Omit<AuthSession, "user"> & {
    user: Omit<SessionUser, "portalRole"> | SessionUser;
  }
) {
  const normalizedSession: AuthSession = {
    ...session,
    validatedAt: session.validatedAt ?? Date.now(),
    user: normalizeSessionUser(session.user),
  };

  if (!isBrowser()) {
    return normalizedSession;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(normalizedSession));
  dispatchAuthChanged();

  return normalizedSession;
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
  dispatchAuthChanged();
}

export function isPortalRoleAuthorized(
  userRole: ApiUserRole,
  requiredPortalRole: PortalRole
) {
  return getPortalRoleForUserRole(userRole) === requiredPortalRole;
}

export function readJwtExpiry(token?: string | null) {
  if (!token) {
    return null;
  }

  const [, payloadSegment] = token.split(".");

  if (!payloadSegment) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(decodeBase64Url(payloadSegment)) as {
      exp?: unknown;
    };

    return typeof parsedPayload.exp === "number" ? parsedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token?: string | null, bufferMs = 0) {
  const expiry = readJwtExpiry(token);

  if (!expiry) {
    return true;
  }

  return expiry <= Date.now() + Math.max(bufferMs, 0);
}

export function formatUserRole(role?: ApiUserRole | null) {
  if (role === "SUPER_ADMIN") {
    return "Super Admin";
  }

  if (role === "DEPARTMENT_ADMIN") {
    return "Department Admin";
  }

  if (role === "EMPLOYEE") {
    return "Employee";
  }

  return "Citizen";
}
