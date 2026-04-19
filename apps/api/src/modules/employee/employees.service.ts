import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import {
  EmployeeDirectoryRecord,
  EmployeeDirectoryRepository,
  toSafeEmployeeDirectoryRecord,
  type EmployeeDirectoryUpdateInput
} from "modules/user/employee-directory.repository";
import { UsersRepository } from "modules/user/user.repository";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";
import { hashPassword } from "utils/password";

type Actor = { id: string; role: UserRole };
type RequestContext = { ipAddress?: string; userAgent?: string };
type EmployeeScope =
  | { kind: "all" }
  | { kind: "empty" }
  | { kind: "department"; departmentName: string };

interface EmployeeUpdateInput {
  name?: string;
  phone?: string;
  department?: string;
  category?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  guardianName?: string;
  guardianPhone?: string;
  pincode?: string;
  password?: string;
}

interface CreateEmployeeInput {
  name: string;
  email?: string;
  password?: string;
  department?: string;
  category?: string;
  gender?: string;
  age?: number;
  phone?: string;
  status?: string;
  dateOfBirth?: string;
  aadharNumber?: string;
  panNumber?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
  guardianName?: string;
  relation?: string;
  guardianPhone?: string;
  pincode?: string;
}

function normalizeOptionalField(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function isEmployeeActive(status?: string | null) {
  const normalizedStatus = status?.trim().toLowerCase();

  return (
    normalizedStatus !== "inactive" &&
    normalizedStatus !== "disabled" &&
    normalizedStatus !== "terminated" &&
    normalizedStatus !== "blocked"
  );
}

export class EmployeesService {
  constructor(
    private readonly employeeDirectoryRepository: EmployeeDirectoryRepository = new EmployeeDirectoryRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository()
  ) {}

  async listEmployees(
    actor: Actor,
    filters: {
      department?: string;
      status?: string;
      search?: string;
    } = {}
  ) {
    const scope = await this.buildScope(actor);

    if (scope.kind === "empty") {
      return [];
    }

    const employees = await this.employeeDirectoryRepository.listEmployees({
      department: scope.kind === "department" ? scope.departmentName : filters.department,
      status: filters.status,
      search: filters.search
    });

    await this.syncShadowUsers(employees);

    return employees;
  }

  async getById(id: string, actor: Actor, requestContext?: RequestContext) {
    const employee = await this.employeeDirectoryRepository.findEmployeeById(id, {
      includePassword: true
    });
    const scope = await this.buildScope(actor);

    this.assertEmployeeInScope(
      employee,
      scope,
      actor.id,
      requestContext,
      "security.employee_directory_read_denied"
    );

    await this.syncShadowUsers([employee]);

    return toSafeEmployeeDirectoryRecord(employee);
  }

  async updateById(
    id: string,
    data: EmployeeUpdateInput,
    actor: Actor,
    requestContext?: RequestContext
  ) {
    const existingEmployee = await this.employeeDirectoryRepository.findEmployeeById(id);
    const scope = await this.buildScope(actor);

    this.assertEmployeeInScope(
      existingEmployee,
      scope,
      actor.id,
      requestContext,
      "security.employee_directory_update_denied",
      data.department
    );

    const updatePayload: EmployeeDirectoryUpdateInput = {
      name: normalizeOptionalField(data.name),
      phone: normalizeOptionalField(data.phone),
      department: normalizeOptionalField(data.department),
      category: normalizeOptionalField(data.category),
      permanentAddress: normalizeOptionalField(data.permanentAddress),
      temporaryAddress: normalizeOptionalField(data.temporaryAddress),
      guardianName: normalizeOptionalField(data.guardianName),
      guardianPhone: normalizeOptionalField(data.guardianPhone),
      pincode: normalizeOptionalField(data.pincode)
    };

    if (data.password) {
      updatePayload.passwordHash = await hashPassword(data.password);
    }

    const updatedEmployee = await this.employeeDirectoryRepository.updateEmployee(
      id,
      updatePayload
    );

    await this.syncShadowUsers([updatedEmployee]);

    await queueAuditLogJob({
      userId: actor.id,
      action: "employee.updated",
      entity: "EmployeeDirectory",
      entityId: String(id),
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata: {
        editableFields: Object.entries(data)
          .filter(([key, value]) => key !== "password" && value !== undefined)
          .map(([key]) => key),
        passwordUpdated: Boolean(data.password),
        before: {
          name: existingEmployee.name,
          phone: existingEmployee.phone,
          department: existingEmployee.department,
          category: existingEmployee.category,
          permanentAddress: existingEmployee.permanentAddress,
          temporaryAddress: existingEmployee.temporaryAddress,
          guardianName: existingEmployee.guardianName,
          guardianPhone: existingEmployee.guardianPhone,
          pincode: existingEmployee.pincode
        },
        after: {
          name: updatedEmployee.name,
          phone: updatedEmployee.phone,
          department: updatedEmployee.department,
          category: updatedEmployee.category,
          permanentAddress: updatedEmployee.permanentAddress,
          temporaryAddress: updatedEmployee.temporaryAddress,
          guardianName: updatedEmployee.guardianName,
          guardianPhone: updatedEmployee.guardianPhone,
          pincode: updatedEmployee.pincode
        }
      }
    });

    return updatedEmployee;
  }

  async createEmployee(
    data: CreateEmployeeInput,
    actor: Actor,
    requestContext?: RequestContext
  ) {
    await this.buildScope(actor);

    const createdEmployee = await this.employeeDirectoryRepository.createEmployee({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      passwordHash: data.password?.trim() ? await hashPassword(data.password.trim()) : null,
      department: normalizeOptionalField(data.department),
      category: normalizeOptionalField(data.category),
      gender: normalizeOptionalField(data.gender),
      age: data.age ?? null,
      phone: normalizeOptionalField(data.phone),
      status: normalizeOptionalField(data.status) ?? "Active",
      dateOfBirth: normalizeOptionalField(data.dateOfBirth),
      aadharNumber: normalizeOptionalField(data.aadharNumber),
      panNumber: normalizeOptionalField(data.panNumber)?.toUpperCase() ?? null,
      permanentAddress: normalizeOptionalField(data.permanentAddress),
      temporaryAddress: normalizeOptionalField(data.temporaryAddress),
      bankName: normalizeOptionalField(data.bankName),
      ifscCode: normalizeOptionalField(data.ifscCode)?.toUpperCase() ?? null,
      accountNumber: normalizeOptionalField(data.accountNumber),
      guardianName: normalizeOptionalField(data.guardianName),
      relation: normalizeOptionalField(data.relation),
      guardianPhone: normalizeOptionalField(data.guardianPhone),
      pincode: normalizeOptionalField(data.pincode),
      profileCompleted: Boolean(
        normalizeOptionalField(data.name) &&
          normalizeOptionalField(data.phone) &&
          normalizeOptionalField(data.gender) &&
          normalizeOptionalField(data.dateOfBirth) &&
          normalizeOptionalField(data.permanentAddress) &&
          normalizeOptionalField(data.pincode) &&
          normalizeOptionalField(data.aadharNumber) &&
          normalizeOptionalField(data.panNumber)
      )
    });

    await this.syncShadowUsers([createdEmployee]);

    await queueAuditLogJob({
      userId: actor.id,
      action: "employee.created",
      entity: "EmployeeDirectory",
      entityId: String(createdEmployee.id),
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata: {
        department: createdEmployee.department ?? null,
        category: createdEmployee.category ?? null,
        status: createdEmployee.status ?? null,
        hasEmail: Boolean(createdEmployee.email),
        hasPassword: Boolean(data.password?.trim())
      }
    });

    return createdEmployee;
  }

  private async buildScope(actor: Actor): Promise<EmployeeScope> {
    const actorProfile = await this.usersRepository.findById(actor.id);

    if (!actorProfile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    if (actorProfile.role === UserRole.SUPER_ADMIN) {
      return { kind: "all" } as const;
    }

    if (actorProfile.role === UserRole.DEPARTMENT_ADMIN) {
      return { kind: "all" } as const;
    }

    throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
  }

  private assertEmployeeInScope(
    employee: EmployeeDirectoryRecord,
    scope: EmployeeScope,
    actorId: string,
    requestContext: RequestContext | undefined,
    action: string,
    requestedDepartment?: string
  ) {
    if (scope.kind === "all") {
      return;
    }

    if (scope.kind === "empty") {
      this.logBlockedAction(
        actorId,
        action,
        {
          targetEmployeeId: employee.id,
          targetDepartment: employee.department ?? null,
          requestedDepartment: requestedDepartment ?? null
        },
        requestContext
      );

      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const currentDepartment = employee.department?.trim().toLowerCase() ?? "";
    const nextDepartment = requestedDepartment?.trim().toLowerCase();
    const allowedDepartment = scope.departmentName.trim().toLowerCase();
    const isCurrentDepartmentAllowed =
      currentDepartment && currentDepartment === allowedDepartment;
    const isRequestedDepartmentAllowed =
      nextDepartment == null || nextDepartment === allowedDepartment;

    if (isCurrentDepartmentAllowed && isRequestedDepartmentAllowed) {
      return;
    }

    this.logBlockedAction(
      actorId,
      action,
      {
        targetEmployeeId: employee.id,
        targetDepartment: employee.department ?? null,
        requestedDepartment: requestedDepartment ?? null
      },
      requestContext
    );

    throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
  }

  private async syncShadowUsers(employees: EmployeeDirectoryRecord[]) {
    await Promise.allSettled(
      employees.map(async (employee) => {
        if (!employee.email?.trim() || !employee.name?.trim()) {
          return;
        }

        await this.usersRepository.upsertEmployeeShadowUser({
          email: employee.email,
          fullName: employee.name,
          phone: employee.phone,
          departmentName: employee.department,
          isActive: isEmployeeActive(employee.status)
        });
      })
    );
  }

  private logBlockedAction(
    userId: string,
    action: string,
    metadata: Record<string, unknown>,
    requestContext?: RequestContext
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
