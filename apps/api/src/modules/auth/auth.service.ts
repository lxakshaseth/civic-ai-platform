import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";

import { env } from "config/env";
import type { RefreshTokenPayload } from "modules/auth/auth.interface";
import { ProfileService } from "modules/profile/profile.service";
import { ProfileRepository } from "modules/profile/profile.repository";
import { AppError } from "shared/errors/app-error";
import { hashText } from "utils/crypto";
import { durationToMs } from "utils/duration";
import { logger } from "utils/logger";
import { hashPassword, verifyPassword } from "utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "utils/token";

import { AuthRepository, type AuthUserRecord } from "./auth.repository";
import type { AuthResponseUser } from "./auth.dto";

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
  role?: UserRole;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository = new AuthRepository(),
    private readonly profileService: ProfileService = new ProfileService(),
    private readonly profileRepository: ProfileRepository = new ProfileRepository()
  ) {}

  async register(input: RegisterInput) {
    const registrationRole = input.role ?? UserRole.CITIZEN;

    if (registrationRole === UserRole.SUPER_ADMIN) {
      throw new AppError(
        "Super admin self-registration is not allowed",
        StatusCodes.FORBIDDEN,
        "ROLE_NOT_ALLOWED"
      );
    }

    const existingUser = await this.authRepository.findUserByEmail(input.email);

    if (existingUser) {
      throw new AppError("Email already registered", StatusCodes.CONFLICT, "EMAIL_EXISTS");
    }

    if (input.phone) {
      const existingPhoneUser = await this.authRepository.findUserByPhone(input.phone);

      if (existingPhoneUser) {
        throw new AppError("Phone number already registered", StatusCodes.CONFLICT, "PHONE_EXISTS");
      }
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepository.createUser({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: registrationRole
    });

    return {
      user: await this.buildAuthUser(user),
      ...(await this.issueTokens(user))
    };
  }

  async login(input: LoginInput, _requestContext?: RequestContext) {
    const user = await this.authRepository.findUserByIdentifier(input.email);

    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }

    const passwordVerification = await verifyPassword(input.password, user.passwordHash);

    if (!passwordVerification.matched) {
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }

    if (passwordVerification.needsUpgrade) {
      const upgradedPasswordHash = await hashPassword(input.password);

      await this.authRepository.updatePasswordHash(user.id, upgradedPasswordHash);
      user.passwordHash = upgradedPasswordHash;

      logger.warn(
        {
          userId: user.id,
          email: user.email
        },
        "Upgraded legacy stored password to bcrypt during login"
      );
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive", StatusCodes.FORBIDDEN, "USER_INACTIVE");
    }

    if (input.role && !this.matchesRequestedRole(input.role, user.role)) {
      throw new AppError(
        "This account does not have access to the selected portal",
        StatusCodes.FORBIDDEN,
        "ROLE_MISMATCH"
      );
    }

    return {
      user: await this.buildAuthUser(user),
      ...(await this.issueTokens(user))
    };
  }

  async refresh(refreshToken: string, _requestContext?: RequestContext) {
    let payload: RefreshTokenPayload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
    }

    const tokenRecord = await this.authRepository.findRefreshToken(hashText(refreshToken));

    if (!tokenRecord || tokenRecord.userId !== payload.id) {
      await this.authRepository.revokeActiveRefreshTokensByUserId(payload.id);
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
    }

    const user = await this.authRepository.findUserById(payload.id);

    if (!user) {
      await this.authRepository.revokeActiveRefreshTokensByUserId(payload.id);
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    if (!user.isActive) {
      await this.authRepository.revokeActiveRefreshTokensByUserId(user.id);
      throw new AppError("User account is inactive", StatusCodes.FORBIDDEN, "USER_INACTIVE");
    }

    return {
      user: await this.buildAuthUser(user),
      ...(await this.issueTokens(user))
    };
  }

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await this.authRepository.revokeRefreshToken(payload.id);
    } catch {
      return { loggedOut: true };
    }

    return { loggedOut: true };
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    return this.buildAuthUser(user);
  }

  private async issueTokens(user: AuthUserRecord) {
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
      jti: uuid()
    });

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashText(refreshToken),
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN))
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken
    };
  }

  private matchesRequestedRole(requestedRole: UserRole, actualRole: UserRole) {
    if (requestedRole === UserRole.DEPARTMENT_ADMIN) {
      return actualRole === UserRole.DEPARTMENT_ADMIN || actualRole === UserRole.SUPER_ADMIN;
    }

    if (requestedRole === UserRole.SUPER_ADMIN) {
      return actualRole === UserRole.SUPER_ADMIN;
    }

    return requestedRole === actualRole;
  }

  private async buildAuthUser(user: AuthUserRecord): Promise<AuthResponseUser> {
    let profile:
      | Awaited<ReturnType<ProfileRepository["findByEmail"]>>
      | Awaited<ReturnType<ProfileService["syncAuthUserProfile"]>>
      | null = null;

    try {
      profile = await this.profileRepository.findByEmail(user.email);

      if (!profile) {
        profile = await this.profileService.syncAuthUserProfile({
          email: user.email,
          name: user.fullName,
          role: user.role,
          phone: user.phone,
          language: user.language ?? "en"
        });
      }
    } catch (error) {
      logger.warn(
        {
          error,
          userId: user.id,
          email: user.email
        },
        "Profile sync failed during auth. Falling back to auth user payload."
      );
    }

    const profileGender = profile
      ? "gender" in profile
        ? profile.gender
        : null
      : null;
    const profileLanguage = profile
      ? "language" in profile
        ? profile.language
        : null
      : null;
    const profileCompleted = profile
      ? "profile_completed" in profile
        ? profile.profile_completed
        : "profileCompleted" in profile
          ? profile.profileCompleted
          : null
      : null;
    const profileShowSanitaryFeature = profile
      ? "show_sanitary_feature" in profile
        ? profile.show_sanitary_feature
        : "showSanitaryFeature" in profile
          ? profile.showSanitaryFeature
          : null
      : null;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      gender: profileGender || user.gender || null,
      language: profileLanguage || user.language || "en",
      profileCompleted: profileCompleted ?? user.profileCompleted,
      showSanitaryFeature: profileShowSanitaryFeature ?? Boolean(user.showSanitaryFeature)
    };
  }
}
