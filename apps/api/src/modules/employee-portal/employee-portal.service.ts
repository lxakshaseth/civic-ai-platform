import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { queryCivicPlatform } from "database/clients/civic-platform";
import { prisma } from "database/clients/prisma";
import { aiClient } from "integrations/ai/ai.client";
import { ComplaintsService } from "modules/complaint/complaint.service";
import { ProfileRepository } from "modules/profile/profile.repository";
import { AppError } from "shared/errors/app-error";

type EmployeeActor = {
  id: string;
  email: string;
  role: UserRole;
};

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

type EmployeeTaskFilters = {
  status?: string;
  department?: string;
  category?: string;
  priority?: string;
  search?: string;
  limit?: number;
};

type ComplaintTaskRecord = {
  id: string;
  title: string;
  issueType?: string;
  urgencyScore?: number;
  tags?: string[];
  structuredAddress?: {
    houseNo: string;
    street: string;
    landmark?: string | null;
    area: string;
    city: string;
    pincode: string;
  } | null;
  category: string;
  department: string;
  address: string;
  status: string;
  internalStatus?: string;
  priority: "Low" | "Medium" | "High";
  createdAt: string;
  createdBy: string;
  lat: number;
  lng: number;
  description: string;
  assignedTo: string | null;
  proof?: {
    items?: Array<unknown>;
  } | null;
};

const COMPLETED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

function normalizePriority(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "high") return "High" as const;
  if (normalized === "low") return "Low" as const;
  return "Medium" as const;
}

function calculateDueDate(assignedAt: string, priority: "High" | "Medium" | "Low") {
  const dueDate = new Date(assignedAt);
  const daysToAdd = priority === "High" ? 2 : priority === "Medium" ? 4 : 7;
  dueDate.setUTCDate(dueDate.getUTCDate() + daysToAdd);
  return dueDate.toISOString();
}

function startOfUtcWeek(input: Date) {
  const date = new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
  );
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(input: Date) {
  return input.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export class EmployeePortalService {
  constructor(
    private readonly complaintsService: ComplaintsService = new ComplaintsService(),
    private readonly profileRepository: ProfileRepository = new ProfileRepository()
  ) {}

  async getDashboard(
    actor: EmployeeActor,
    options: {
      limit?: number;
    } = {}
  ) {
    await this.assertEmployee(actor);

    const [tasks, ticketStats, notificationStats, complaintStats] = await Promise.all([
      this.listEmployeeTasks(actor, {
        limit: options.limit ?? 4
      }),
      prisma.ticket.count({
        where: {
          complaint: {
            assignedEmployeeId: actor.id
          },
          status: "PENDING"
        }
      }),
      prisma.notification.count({
        where: {
          userId: actor.id,
          readAt: null
        }
      }),
      Promise.all([
        prisma.complaint.count({
          where: {
            assignedEmployeeId: actor.id
          }
        }),
        prisma.complaint.count({
          where: {
            assignedEmployeeId: actor.id,
            status: {
              in: ["RESOLVED", "CLOSED"]
            }
          }
        }),
        prisma.complaint.count({
          where: {
            assignedEmployeeId: actor.id,
            status: {
              notIn: ["RESOLVED", "CLOSED"]
            }
          }
        })
      ])
    ]);
    const [totalAssigned, completed, pending] = complaintStats;

    return {
      summary: {
        totalAssignedTasks: totalAssigned,
        completedTasks: completed,
        pendingTasks: pending,
        escalatedTickets: ticketStats,
        unreadNotifications: notificationStats
      },
      recentTasks: tasks.items,
      filters: tasks.filters
    };
  }

  async listEmployeeTasks(actor: EmployeeActor, filters: EmployeeTaskFilters = {}) {
    await this.assertEmployee(actor);

    const complaints = (await this.complaintsService.listEmployeeTasks(actor, {
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
      search: filters.search
    })) as ComplaintTaskRecord[];

    const filteredByDepartment = filters.department?.trim()
      ? complaints.filter(
          (complaint) =>
            complaint.department.trim().toLowerCase() === filters.department?.trim().toLowerCase()
        )
      : complaints;

    const complaintIds = filteredByDepartment.map((complaint) => complaint.id);
    const [assignmentTimes, ticketCounts] = await Promise.all([
      this.getLatestAssignmentTimes(complaintIds, actor.id),
      this.getTicketCounts(complaintIds)
    ]);

    const mappedItems = filteredByDepartment.map((complaint) =>
      this.presentTask(
        complaint,
        assignmentTimes.get(complaint.id) ?? complaint.createdAt,
        ticketCounts.get(complaint.id) ?? 0
      )
    );
    const items = mappedItems.slice(0, filters.limit ?? mappedItems.length);

    return {
      items,
      filters: {
        departments: [...new Set(mappedItems.map((item) => item.department).filter(Boolean))].sort(),
        categories: [...new Set(mappedItems.map((item) => item.category).filter(Boolean))].sort(),
        priorities: ["High", "Medium", "Low"],
        statuses: [
          "Assigned",
          "In Progress",
          "Reassigned",
          "Pending Admin Approval",
          "Resolved"
        ]
      }
    };
  }

  async listNearbyIssues(
    actor: EmployeeActor,
    input: {
      lat: number;
      lng: number;
      radiusKm?: number;
    }
  ) {
    await this.assertEmployee(actor);

    const nearbyComplaints = await this.complaintsService.listNearbyComplaints(actor, {
      lat: input.lat,
      lng: input.lng,
      radiusKm: input.radiusKm
    });

    const complaintIds = nearbyComplaints.map((item) => item.complaint.id);
    const [assignmentTimes, ticketCounts] = await Promise.all([
      this.getLatestAssignmentTimes(complaintIds, actor.id),
      this.getTicketCounts(complaintIds)
    ]);

    return {
      radiusKm: input.radiusKm ?? 5,
      origin: {
        latitude: input.lat,
        longitude: input.lng
      },
      items: nearbyComplaints.map((item) => ({
        ...this.presentTask(
          item.complaint as ComplaintTaskRecord,
          assignmentTimes.get(item.complaint.id) ?? item.complaint.createdAt,
          ticketCounts.get(item.complaint.id) ?? 0
        ),
        distanceKm: item.distanceKm != null ? Number(item.distanceKm.toFixed(2)) : null,
        isAssignedToYou: item.complaint.assignedTo === actor.id
      }))
    };
  }

  async uploadProof(
    actor: EmployeeActor,
    input: {
      complaintId: string;
      note: string;
      markAsCompleted?: boolean;
      latitude?: number;
      longitude?: number;
    },
    files: {
      beforeImages: Express.Multer.File[];
      afterImages: Express.Multer.File[];
      invoice?: Express.Multer.File;
    },
    requestContext?: RequestContext
  ) {
    await this.assertEmployee(actor);

    if (!files.beforeImages.length && !files.afterImages.length && !files.invoice) {
      throw new AppError(
        "Upload at least one proof image or invoice",
        StatusCodes.BAD_REQUEST,
        "PROOF_FILES_REQUIRED"
      );
    }

    if (input.markAsCompleted !== false && !files.afterImages.length) {
      throw new AppError(
        "At least one after image is required before marking the task completed",
        StatusCodes.BAD_REQUEST,
        "AFTER_IMAGE_REQUIRED"
      );
    }

    const complaint = await this.complaintsService.getById(input.complaintId, actor);

    if (complaint.assignedTo !== actor.id) {
      throw new AppError(
        "Only the assigned employee can upload proof for this task",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    for (const beforeImage of files.beforeImages) {
      await this.complaintsService.submitProof(
        input.complaintId,
        {
          type: "BEFORE",
          note: input.note,
          latitude: input.latitude,
          longitude: input.longitude,
          markAsCompleted: false
        },
        actor,
        beforeImage,
        requestContext
      );
    }

    if (input.markAsCompleted === false) {
      for (const afterImage of files.afterImages) {
        await this.complaintsService.submitProof(
          input.complaintId,
          {
            type: "AFTER",
            note: input.note,
            latitude: input.latitude,
            longitude: input.longitude,
            markAsCompleted: false
          },
          actor,
          afterImage,
          requestContext
        );
      }

      if (files.invoice) {
        await this.complaintsService.submitProof(
          input.complaintId,
          {
            type: "INVOICE",
            note: input.note,
            markAsCompleted: false
          },
          actor,
          files.invoice,
          requestContext
        );
      }

      return {
        complaint: await this.complaintsService.getById(input.complaintId, actor)
      };
    }

    const completion = await this.complaintsService.completeComplaint(
      input.complaintId,
      {
        notes: input.note,
        latitude: input.latitude,
        longitude: input.longitude
      },
      actor,
      files.afterImages,
      files.invoice,
      requestContext
    );

    return {
      complaint: completion.complaint
    };
  }

  async getPerformance(
    actor: EmployeeActor,
    options: {
      weeks?: number;
    } = {}
  ) {
    await this.assertEmployee(actor);

    const weeks = options.weeks ?? 6;
    const complaints = (await prisma.complaint.findMany({
      where: {
        assignedEmployeeId: actor.id
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
        feedback: {
          select: {
            rating: true
          }
        }
      }
    })).map((row) => ({
      ...row,
      rating: row.feedback?.rating ?? null,
      createdAtDate: new Date(row.createdAt),
      endedAtDate: row.closedAt ? new Date(row.closedAt) : row.resolvedAt ? new Date(row.resolvedAt) : null,
      internalStatus: row.status?.trim().toUpperCase() || "OPEN"
    }));
    const completedComplaints = complaints.filter((complaint) =>
      COMPLETED_STATUSES.has(complaint.internalStatus)
    );
    const resolutionHours = completedComplaints
      .map((complaint) =>
        complaint.endedAtDate
          ? (complaint.endedAtDate.getTime() - complaint.createdAtDate.getTime()) / (1000 * 60 * 60)
          : null
      )
      .filter((value): value is number => value != null);
    const ratings = complaints
      .map((complaint) => complaint.rating)
      .filter((value): value is number => typeof value === "number");

    const currentWeek = startOfUtcWeek(new Date());
    const weeklyPerformance = Array.from({ length: weeks }, (_, index) => {
      const weekStart = new Date(currentWeek);
      weekStart.setUTCDate(currentWeek.getUTCDate() - (weeks - index - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const completed = completedComplaints.filter((complaint) => {
        return complaint.endedAtDate != null && complaint.endedAtDate >= weekStart && complaint.endedAtDate < weekEnd;
      }).length;

      const assigned = complaints.filter(
        (complaint) => complaint.createdAtDate >= weekStart && complaint.createdAtDate < weekEnd
      ).length;

      return {
        label: `${formatWeekLabel(weekStart)} - ${formatWeekLabel(
          new Date(weekEnd.getTime() - 24 * 60 * 60 * 1000)
        )}`,
        completed,
        assigned
      };
    });

    const totalAssigned = complaints.length;
    const totalCompleted = completedComplaints.length;

    return {
      summary: {
        totalTasksCompleted: totalCompleted,
        averageResolutionHours:
          resolutionHours.length > 0
            ? Number(
                (
                  resolutionHours.reduce((sum, value) => sum + value, 0) /
                  resolutionHours.length
                ).toFixed(2)
              )
            : 0,
        rating:
          ratings.length > 0
            ? Number(
                (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2)
              )
            : 0,
        completionRate:
          totalAssigned > 0 ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2)) : 0,
        totalAssigned
      },
      weeklyPerformance
    };
  }

  async askAssistant(
    actor: EmployeeActor,
    input: {
      question: string;
    }
  ) {
    await this.assertEmployee(actor);

    const employeeProfile = await this.profileRepository.findByEmail(actor.email);
    const departmentContext = employeeProfile?.department?.trim()
      ? `Department: ${employeeProfile.department.trim()}.`
      : "";

    const response = await aiClient.generateChatReply({
      userRole: "employee",
      question: `${departmentContext} You are helping a municipal field employee. Give a concise operational answer with steps, safety checks, and escalation guidance when needed. Employee question: ${input.question.trim()}`
    });

    return {
      answer: response.answer,
      provider: response.provider ?? "ai-service",
      model: response.model ?? null,
      suggestions: [
        "List the first 3 on-site checks to perform",
        "What tools or materials are usually needed?",
        "When should this issue be escalated to admin?"
      ]
    };
  }

  private async assertEmployee(actor: EmployeeActor) {
    const profile = await prisma.user.findUnique({
      where: {
        id: actor.id
      },
      select: {
        id: true,
        role: true,
        isActive: true
      }
    });

    if (!profile) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }

    if (profile.role !== UserRole.EMPLOYEE) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    if (!profile.isActive) {
      throw new AppError("Employee account is inactive", StatusCodes.FORBIDDEN, "USER_INACTIVE");
    }
  }

  private async getLatestAssignmentTimes(complaintIds: string[], employeeId: string) {
    const assignmentTimes = new Map<string, string>();

    if (!complaintIds.length) {
      return assignmentTimes;
    }

    const result = await queryCivicPlatform<{
      complaintId: string | null;
      assignedAt: string | null;
    }>(
      `
        SELECT
          "complaintId" AS "complaintId",
          "createdAt"::text AS "assignedAt"
        FROM public.complaint_assignment
        WHERE "complaintId" = ANY($1::text[])
          AND "employeeId" = $2
        ORDER BY "createdAt" DESC NULLS LAST, id DESC
      `,
      [complaintIds, employeeId]
    );

    for (const row of result.rows) {
      if (!row.complaintId || !row.assignedAt || assignmentTimes.has(row.complaintId)) {
        continue;
      }

      assignmentTimes.set(row.complaintId, row.assignedAt);
    }

    return assignmentTimes;
  }

  private async getTicketCounts(complaintIds: string[]) {
    const counts = new Map<string, number>();

    if (!complaintIds.length) {
      return counts;
    }

    const result = await queryCivicPlatform<{
      complaintId: string;
      count: string;
    }>(
      `
        SELECT
          "complaintId" AS "complaintId",
          COUNT(*)::text AS count
        FROM public."Ticket"
        WHERE "complaintId" = ANY($1::text[])
        GROUP BY "complaintId"
      `,
      [complaintIds]
    );

    for (const row of result.rows) {
      counts.set(row.complaintId, Number(row.count));
    }

    return counts;
  }

  private presentTask(complaint: ComplaintTaskRecord, assignedAt: string, ticketCount: number) {
    const priority = normalizePriority(complaint.priority);
    const internalStatus = complaint.internalStatus?.trim().toUpperCase() || "OPEN";

    return {
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      issueType: (complaint.issueType ?? complaint.category) || "General civic issue",
      urgencyScore: complaint.urgencyScore ?? 68,
      tags: complaint.tags ?? [],
      structuredAddress: complaint.structuredAddress ?? null,
      status: complaint.status,
      internalStatus,
      priority,
      department: complaint.department || "Unassigned",
      departmentId: complaint.department || null,
      category: complaint.category || "General",
      address: complaint.address || "Location unavailable",
      citizenName: complaint.createdBy || "Citizen",
      assignedAt,
      dueDate: calculateDueDate(assignedAt, priority),
      createdAt: complaint.createdAt,
      resolvedAt: COMPLETED_STATUSES.has(internalStatus) ? complaint.createdAt : null,
      latitude: Number.isFinite(complaint.lat) ? complaint.lat : null,
      longitude: Number.isFinite(complaint.lng) ? complaint.lng : null,
      ticketCount,
      proofCount: complaint.proof?.items?.length ?? 0,
      isCompleted: COMPLETED_STATUSES.has(internalStatus),
      isPending: !COMPLETED_STATUSES.has(internalStatus)
    };
  }
}
