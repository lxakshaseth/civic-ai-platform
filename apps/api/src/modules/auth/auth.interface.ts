import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenPayload extends AuthenticatedUser {
  type: "access";
}

export interface RefreshTokenPayload extends AuthenticatedUser {
  type: "refresh";
  jti: string;
}

