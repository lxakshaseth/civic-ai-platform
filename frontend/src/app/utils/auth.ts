import { ApiError, apiRequest } from "@/src/lib/api";
import {
  clearAuthSession,
  isPortalRoleAuthorized,
  readAuthSession,
  type PortalRole,
  type SessionUser,
  writeAuthSession,
} from "@/src/lib/session";

type AuthApiRole = "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN";

type AuthPayload = {
  user: Omit<SessionUser, "portalRole">;
  accessToken: string;
  refreshToken?: string | null;
  token?: string | null;
};

type LoginInput = {
  email: string;
  password: string;
  role: PortalRole;
};

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: PortalRole;
};

const PENDING_ROLE_KEY = "saip_pending_role";

function mapPortalRoleToApiRole(role: PortalRole): AuthApiRole {
  if (role === "employee") {
    return "EMPLOYEE";
  }

  if (role === "admin") {
    return "DEPARTMENT_ADMIN";
  }

  return "CITIZEN";
}

function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("Unable to connect to the server.", 500);
}

export type User = SessionUser;

export function getCurrentUser(): SessionUser | null {
  return readAuthSession()?.user ?? null;
}

export function getAccessToken() {
  return readAuthSession()?.accessToken ?? null;
}

export async function loginUser(input: LoginInput) {
  try {
    const requestBody = {
      email: input.email.trim(),
      password: input.password,
      role: mapPortalRoleToApiRole(input.role),
    };

    const payload = await apiRequest<AuthPayload>("/auth/login", {
      method: "POST",
      body: requestBody,
    });

    return writeAuthSession(payload).user;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function registerUser(input: RegisterInput) {
  try {
    const requestBody: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      role: AuthApiRole;
    } = {
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      password: input.password,
      role: mapPortalRoleToApiRole(input.role),
    };

    const normalizedPhone = input.phone?.trim();

    if (normalizedPhone) {
      requestBody.phone = normalizedPhone;
    }

    const payload = await apiRequest<AuthPayload>("/auth/register", {
      method: "POST",
      body: requestBody,
    });

    return writeAuthSession(payload).user;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function syncCurrentUser() {
  const session = readAuthSession();

  if (!session) {
    return null;
  }

  try {
    const user = await apiRequest<Omit<SessionUser, "portalRole">>("/auth/me");
    return writeAuthSession({
      ...session,
      user,
    }).user;
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      clearAuthSession();
      return null;
    }

    return session.user;
  }
}

export async function logout() {
  const session = readAuthSession();

  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: session?.refreshToken ? { refreshToken: session.refreshToken } : {},
    });
  } catch {
    // Ignore logout errors and still clear the local session.
  } finally {
    clearAuthSession();
    clearPendingRole();
  }
}

export function isUserAuthorizedForPortal(
  user: SessionUser | null,
  requiredRole: PortalRole
) {
  return user ? isPortalRoleAuthorized(user.role, requiredRole) : false;
}

export function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return null;
}

export const setPendingRole = (role: "employee" | "admin"): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_ROLE_KEY, role);
};

export const getPendingRole = (): "employee" | "admin" | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PENDING_ROLE_KEY) as "employee" | "admin" | null;
};

export const clearPendingRole = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_ROLE_KEY);
};
