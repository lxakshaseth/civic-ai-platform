import { Prisma, UserRole, type RefreshToken, type User } from "@prisma/client";

import { prisma } from "database/clients/prisma";

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

const authUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  departmentId: true,
  isActive: true,
  passwordHash: true,
  showSanitaryFeature: true
} satisfies Prisma.UserSelect;

type PrismaAuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

const mapUserRecord = (user: PrismaAuthUser, refreshTokenHash: string | null = null): AuthUserRecord => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  departmentId: user.departmentId,
  isActive: user.isActive,
  passwordHash: user.passwordHash,
  language: "en",
  gender: null,
  showSanitaryFeature: user.showSanitaryFeature,
  profileCompleted: false,
  refreshTokenHash
});

export class AuthRepository {
  async findUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase()
      },
      select: authUserSelect
    });

    return user ? mapUserRecord(user) : null;
  }

  async findUserByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedIdentifier
          },
          {
            id: identifier.trim()
          }
        ]
      },
      select: authUserSelect
    });

    return user ? mapUserRecord(user) : null;
  }

  async findUserByPhone(phone: string) {
    const user = await prisma.user.findUnique({
      where: {
        phone: phone.trim()
      },
      select: authUserSelect
    });

    return user ? mapUserRecord(user) : null;
  }

  async findUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: authUserSelect
    });

    return user ? mapUserRecord(user) : null;
  }

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  async createUser(data: {
    fullName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: "CITIZEN" | "EMPLOYEE" | "DEPARTMENT_ADMIN";
  }) {
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        passwordHash: data.passwordHash,
        role: data.role
      },
      select: authUserSelect
    });

    return mapUserRecord(user);
  }

  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt
      }
    });
  }

  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  revokeActiveRefreshTokensByUserId(userId: string) {
    return this.revokeRefreshToken(userId);
  }
}
