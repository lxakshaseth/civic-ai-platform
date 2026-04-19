import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";

import {
  EmployeeDirectoryRepository,
  toSafeEmployeeDirectoryRecord
} from "./employee-directory.repository";
import { UsersRepository } from "./user.repository";

const adminRoles: UserRole[] = [UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN];

function mapRequestedRole(role?: string) {
  if (!role) {
    return undefined;
  }

  if (role === "ADMIN") {
    return UserRole.DEPARTMENT_ADMIN;
  }

  if (role === "SUPER_ADMIN") {
    return UserRole.SUPER_ADMIN;
  }

  if (role === "EMPLOYEE") {
    return UserRole.EMPLOYEE;
  }

  return UserRole.CITIZEN;
}

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository = new UsersRepository(),
    private readonly employeeDirectoryRepository: EmployeeDirectoryRepository = new EmployeeDirectoryRepository()
  ) {}

  listDepartments() {
    return this.usersRepository.listDepartments();
  }

  async listUsers(
    actor: { id: string; role: UserRole },
    filters: {
      role?: string;
      departmentId?: string;
      isActive?: boolean;
      search?: string;
    } = {}
  ) {
    await this.assertAdmin(actor);

    return this.usersRepository.listUsers({
      role: mapRequestedRole(filters.role),
      departmentId: filters.departmentId,
      isActive: filters.isActive,
      search: filters.search
    });
  }

  async listEmployees(
    actor: { id: string; role: UserRole },
    filters: {
      departmentId?: string;
      isActive?: boolean;
      search?: string;
    } = {}
  ) {
    await this.assertAdmin(actor);

    return this.usersRepository.listUsers({
      role: UserRole.EMPLOYEE,
      departmentId: filters.departmentId,
      isActive: filters.isActive,
      search: filters.search
    });
  }

  async listEmployeeDirectory(
    actor: { id: string; role: UserRole },
    filters: {
      department?: string;
      search?: string;
      status?: string;
    } = {}
  ) {
    await this.assertAdmin(actor);
    return this.employeeDirectoryRepository.listEmployees(filters);
  }

  async getById(
    id: string,
    actor?: { id: string; role: UserRole },
    requestContext?: { ipAddress?: string; userAgent?: string }
  ) {
    if (actor && !adminRoles.includes(actor.role) && actor.id !== id) {
      this.logBlockedAction(
        actor.id,
        "security.user_read_denied",
        {
          reason: "cross_user_profile_access",
          targetUserId: id
        },
        requestContext
      );
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    return user;
  }

  async getEmployeeDirectoryById(
    id: string,
    actor: { id: string; role: UserRole }
  ) {
    await this.assertAdmin(actor);
    const employee = await this.employeeDirectoryRepository.findEmployeeById(id, {
      includePassword: true
    });

    return toSafeEmployeeDirectoryRecord(employee);
  }

  async updateEmployeeDirectoryById(
    id: string,
    data: {
      name: string;
      phone: string;
      department?: string | null;
      status?: string | null;
      permanentAddress?: string | null;
      temporaryAddress?: string | null;
      bankName?: string | null;
      ifscCode?: string | null;
      accountNumber?: string | null;
      guardianName?: string | null;
      relation?: string | null;
      guardianPhone?: string | null;
    },
    actor: { id: string; role: UserRole },
    requestContext?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.assertAdmin(actor);

    const employee = await this.employeeDirectoryRepository.updateEmployeeRegistry(id, data);

    await queueAuditLogJob({
      userId: actor.id,
      action: "employee_directory.updated",
      entity: "EmployeeDirectory",
      entityId: String(id),
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata: {
        updatedFields: Object.keys(data)
      }
    });

    return toSafeEmployeeDirectoryRecord(employee);
  }

  async updateRole(
    id: string,
    data: { role: UserRole; departmentId?: string | null; isActive?: boolean },
    actor?: { id: string; role: UserRole },
    requestContext?: { ipAddress?: string; userAgent?: string }
  ) {
    if (!actor) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    await this.assertAdmin(actor);

    if (actor.id === id && data.isActive === false) {
      this.logBlockedAction(
        actor.id,
        "security.admin_action_blocked",
        {
          reason: "self_deactivation_blocked",
          targetUserId: id
        },
        requestContext
      );
      throw new AppError("You cannot deactivate your own account", StatusCodes.BAD_REQUEST, "SELF_DEACTIVATION_BLOCKED");
    }

    const updatedUser = await this.usersRepository.updateRole(id, data);

    if (!updatedUser) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    return updatedUser;
  }

  private async assertAdmin(actor: { id: string; role: UserRole }) {
    const actorProfile = await this.usersRepository.findById(actor.id);

    if (!actorProfile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    if (!adminRoles.includes(actorProfile.role)) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private logBlockedAction(
    userId: string | undefined,
    action: string,
    metadata: Record<string, unknown>,
    requestContext?: { ipAddress?: string; userAgent?: string }
  ) {
    void queueAuditLogJob({
      userId,
      action,
      entity: "Security",
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata
    }).catch(() => undefined);
  }
}
