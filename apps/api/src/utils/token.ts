import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

import { env } from "config/env";
import type { AccessTokenPayload, RefreshTokenPayload } from "modules/auth/auth.interface";
import { AppError } from "shared/errors/app-error";

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">) =>
  jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET as Secret, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]
  });

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "type">) =>
  jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET as Secret, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]
  });

const verifyToken = <TPayload extends { type: string; id: string; email: string; role: string }>(
  token: string,
  secret: string,
  expectedType: TPayload["type"]
) => {
  const decoded = jwt.verify(token, secret);

  if (!decoded || typeof decoded !== "object") {
    throw new AppError("Invalid token payload", 401, "INVALID_TOKEN_PAYLOAD");
  }

  const payload = decoded as TPayload;

  if (
    !payload ||
    payload.type !== expectedType ||
    typeof payload.id !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new AppError("Invalid token payload", 401, "INVALID_TOKEN_PAYLOAD");
  }

  return payload;
};

export const verifyAccessToken = (token: string) =>
  verifyToken<AccessTokenPayload>(token, env.JWT_ACCESS_SECRET, "access");

export const verifyRefreshToken = (token: string) =>
  (() => {
    const payload = verifyToken<RefreshTokenPayload>(token, env.JWT_REFRESH_SECRET, "refresh");

    if (typeof payload.jti !== "string" || payload.jti.length === 0) {
      throw new AppError("Invalid token payload", 401, "INVALID_TOKEN_PAYLOAD");
    }

    return payload;
  })();
