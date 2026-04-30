import { ComplaintStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "database/clients/prisma";

const userSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  departmentId: true
} as const;

const departmentSummarySelect = {
  id: true,
  name: true
} as const;

const complaintDetailInclude = {
  citizen: {
    select: userSummarySelect
  },
  department: {
    select: departmentSummarySelect
  },
  assignedEmployee: {
    select: userSummarySelect
  },
  assignments: {
    orderBy: {
      createdAt: "desc" as const
    },
    include: {
      employee: {
        select: userSummarySelect
      },
      department: {
        select: departmentSummarySelect
      },
      assignedBy: {
        select: userSummarySelect
      }
    }
  },
  statusHistory: {
    orderBy: {
      createdAt: "asc" as const
    },
    include: {
      changedBy: {
        select: userSummarySelect
      }
    }
  },
  comments: {
    orderBy: {
      createdAt: "asc" as const
    },
    include: {
      user: {
        select: userSummarySelect
      }
    }
  },
  timelineEntries: {
    orderBy: {
      createdAt: "asc" as const
    },
    include: {
      createdBy: {
        select: userSummarySelect
      }
    }
  },
  feedback: {
    include: {
      citizen: {
        select: userSummarySelect
      },
      officer: {
        select: userSummarySelect
      },
      department: {
        select: departmentSummarySelect
      }
    }
  },
  evidenceItems: {
    orderBy: {
      createdAt: "desc" as const
    },
    include: {
      uploadedBy: {
        select: userSummarySelect
      },
      reviewedBy: {
        select: userSummarySelect
      }
    }
  }
} as const;

const complaintListSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  category: true,
  priority: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  imagePath: true,
  aiCategory: true,
  aiPriority: true,
  aiConfidence: true,
  duplicateScore: true,
  fraudScore: true,
  isSuspicious: true,
  duplicateComplaintId: true,
  citizenId: true,
  departmentId: true,
  assignedEmployeeId: true,
  reopenedCount: true,
  lastStatusChangedAt: true,
  resolvedAt: true,
  closedAt: true,
  rejectedAt: true,
  reopenedAt: true,
  createdAt: true,
  updatedAt: true,
  citizen: {
    select: userSummarySelect
  },
  department: {
    select: departmentSummarySelect
  },
  assignedEmployee: {
    select: userSummarySelect
  },
  feedback: {
    select: {
      rating: true,
      comment: true
    }
  },
  _count: {
    select: {
      assignments: true,
      comments: true,
      evidenceItems: true
    }
  }
} as const;

type ComplaintTimelineMetadata = Prisma.InputJsonValue | undefined;

export type ComplaintRecord = Prisma.ComplaintGetPayload<{
  include: typeof complaintDetailInclude;
}>;

export type ComplaintListRecord = Prisma.ComplaintGetPayload<{
  select: typeof complaintListSelect;
}>;

export type ActorProfile = {
  id: string;
  role: UserRole;
  departmentId: string | null;
};

export class ComplaintsRepository {
  createComplaint(data: {
    title: string;
    description: string;
    issueType?: string;
    urgencyScore?: number;
    tags?: string[];
    structuredAddress?: Prisma.InputJsonValue;
    category?: string;
    priority?: string;
    locationAddress?: string;
    latitude?: number;
    longitude?: number;
    departmentId?: string;
    imagePath?: string;
    citizenId: string;
    aiCategory?: string;
    aiPriority?: string;
    aiConfidence?: number;
    duplicateScore?: number;
    fraudScore?: number;
    isSuspicious?: boolean;
    duplicateComplaintId?: string;
    fraudSignals?: Prisma.InputJsonValue;
    complaintImages?: Array<{
      uploadedById: string;
      fileName: string;
      filePath: string;
      mimeType: string;
      fileSize: number;
      note?: string;
    }>;
  }) {
    const {
      title,
      description,
      issueType,
      urgencyScore,
      tags,
      structuredAddress,
      category,
      priority,
      locationAddress,
      latitude,
      longitude,
      imagePath,
      citizenId,
      departmentId,
      aiCategory,
      aiPriority,
      aiConfidence,
      duplicateScore,
      fraudScore,
      isSuspicious,
      duplicateComplaintId,
      fraudSignals,
      complaintImages
    } = data;
    const createInput: Prisma.ComplaintCreateInput = {
      title,
      description,
      issueType,
      urgencyScore,
      tags,
      structuredAddress,
      category,
      priority,
      locationAddress,
      latitude,
      longitude,
      imagePath,
      aiCategory,
      aiPriority,
      aiConfidence,
      duplicateScore,
      fraudScore,
      isSuspicious,
      duplicateComplaintId,
      fraudSignals,
      status: ComplaintStatus.SUBMITTED,
      lastStatusChangedAt: new Date(),
      citizen: {
        connect: {
          id: citizenId
        }
      },
      ...(departmentId
        ? {
            department: {
              connect: {
                id: departmentId
              }
            }
          }
        : {}),
      statusHistory: {
        create: {
          status: ComplaintStatus.SUBMITTED,
          changedBy: {
            connect: {
              id: citizenId
            }
          },
          note: "Complaint submitted"
        }
      },
      timelineEntries: {
        create: {
          eventType: "complaint.created",
          title: "Complaint created",
          description: "Complaint submitted by citizen",
          createdBy: {
            connect: {
              id: citizenId
            }
          },
          metadata: {
            status: ComplaintStatus.SUBMITTED,
            duplicateScore: duplicateScore ?? null,
            fraudScore: fraudScore ?? null,
            isSuspicious: isSuspicious ?? false,
            fraudSignals: fraudSignals ?? null
          }
        }
      },
      ...(complaintImages?.length
        ? {
            evidenceItems: {
              create: complaintImages.map((item) => ({
                uploadedBy: {
                  connect: {
                    id: item.uploadedById
                  }
                },
                type: "BEFORE",
                fileName: item.fileName,
                filePath: item.filePath,
                mimeType: item.mimeType,
                fileSize: item.fileSize,
                note: item.note
              }))
            }
          }
        : {})
    };

    return prisma.complaint.create({
      data: createInput,
      select: {
        id: true
      }
    });
  }

  listMany(where: Prisma.ComplaintWhereInput) {
    return prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: complaintListSelect
    });
  }

  findById(id: string) {
    return prisma.complaint.findUnique({
      where: { id },
      include: complaintDetailInclude
    });
  }

  findActorProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        departmentId: true
      }
    });
  }

  findDepartmentById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      select: departmentSummarySelect
    });
  }

  findDepartmentByName(name: string) {
    return prisma.department.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive"
        }
      },
      select: departmentSummarySelect
    });
  }

  findDepartments() {
    return prisma.department.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true
      }
    });
  }

  findEmployeeById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...userSummarySelect,
        isActive: true
      }
    });
  }

  listAdminRecipients(departmentId?: string | null) {
    return prisma.user.findMany({
      where: {
        OR: [
          { role: UserRole.SUPER_ADMIN },
          {
            role: UserRole.DEPARTMENT_ADMIN,
            ...(departmentId ? { departmentId } : {})
          }
        ]
      },
      select: {
        id: true
      }
    });
  }

  async updateStatus(
    id: string,
    status: ComplaintStatus,
    changedById: string,
    note?: string,
    extraData: Prisma.ComplaintUpdateInput = {}
  ) {
    return prisma.complaint.update({
      where: { id },
      data: {
        ...extraData,
        status,
        lastStatusChangedAt: new Date(),
        statusHistory: {
          create: {
            status,
            note,
            changedById
          }
        },
        timelineEntries: {
          create: {
            eventType: "complaint.status_changed",
            title: `Complaint moved to ${status}`,
            description: note,
            createdById: changedById,
            metadata: {
              status
            }
          }
        }
      },
      include: complaintDetailInclude
    });
  }

  assignComplaint(data: {
    complaintId: string;
    employeeId: string;
    departmentId?: string;
    assignedById: string;
    note?: string;
    nextStatus?: ComplaintStatus;
  }) {
    return prisma.complaint.update({
      where: { id: data.complaintId },
      data: {
        departmentId: data.departmentId,
        assignedEmployeeId: data.employeeId,
        ...(data.nextStatus
          ? {
              status: data.nextStatus,
              lastStatusChangedAt: new Date(),
              statusHistory: {
                create: {
                  status: data.nextStatus,
                  changedById: data.assignedById,
                  note: "Complaint assignment confirmed"
                }
              }
            }
          : {}),
        assignments: {
          create: {
            employeeId: data.employeeId,
            departmentId: data.departmentId,
            assignedById: data.assignedById,
            note: data.note
          }
        },
        timelineEntries: {
          create: {
            eventType: "complaint.assigned",
            title: "Complaint assigned",
            description: data.note ?? "Complaint assigned to employee",
            createdById: data.assignedById,
            metadata: {
              employeeId: data.employeeId,
              departmentId: data.departmentId ?? null
            }
          }
        }
      },
      include: complaintDetailInclude
    });
  }

  addComment(data: {
    complaintId: string;
    userId: string;
    comment: string;
  }) {
    return prisma.complaint.update({
      where: { id: data.complaintId },
      data: {
        comments: {
          create: {
            userId: data.userId,
            comment: data.comment
          }
        },
        timelineEntries: {
          create: {
            eventType: "complaint.comment_added",
            title: "Comment added",
            description: data.comment,
            createdById: data.userId
          }
        }
      },
      include: complaintDetailInclude
    });
  }

  listComments(complaintId: string) {
    return prisma.complaintComment.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: userSummarySelect
        }
      }
    });
  }

  createFeedback(data: {
    complaintId: string;
    citizenId: string;
    departmentId?: string | null;
    officerId?: string | null;
    rating: number;
    comment?: string;
  }) {
    return prisma.complaint.update({
      where: { id: data.complaintId },
      data: {
        feedback: {
          create: {
            citizenId: data.citizenId,
            departmentId: data.departmentId,
            officerId: data.officerId,
            rating: data.rating,
            comment: data.comment
          }
        },
        timelineEntries: {
          create: {
            eventType: "complaint.feedback_submitted",
            title: "Citizen feedback submitted",
            description: data.comment,
            createdById: data.citizenId,
            metadata: {
              rating: data.rating,
              officerId: data.officerId ?? null,
              departmentId: data.departmentId ?? null
            }
          }
        }
      },
      include: complaintDetailInclude
    });
  }

  addTimelineEntry(data: {
    complaintId: string;
    eventType: string;
    title: string;
    description?: string;
    metadata?: ComplaintTimelineMetadata;
    createdById?: string;
  }) {
    return prisma.complaintTimelineEntry.create({
      data
    });
  }

  getTimeline(complaintId: string) {
    return prisma.complaintTimelineEntry.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: {
          select: userSummarySelect
        }
      }
    });
  }

  findLatestAssignment(complaintId: string) {
    return prisma.complaintAssignment.findFirst({
      where: { complaintId },
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: userSummarySelect
        },
        department: {
          select: departmentSummarySelect
        }
      }
    });
  }

  updateAiSignals(
    complaintId: string,
    data: {
      aiCategory?: string;
      aiPriority?: string;
      aiConfidence?: number;
      category?: string;
      priority?: string;
      departmentId?: string;
      duplicateScore?: number;
      fraudScore?: number;
      isSuspicious?: boolean;
      duplicateComplaintId?: string | null;
      fraudSignals?: Prisma.InputJsonValue;
    }
  ) {
    return prisma.complaint.update({
      where: { id: complaintId },
      data: {
        aiCategory: data.aiCategory,
        aiPriority: data.aiPriority,
        aiConfidence: data.aiConfidence,
        category: data.category ?? data.aiCategory,
        priority: data.priority ?? data.aiPriority,
        departmentId: data.departmentId,
        duplicateScore: data.duplicateScore,
        fraudScore: data.fraudScore,
        isSuspicious: data.isSuspicious,
        duplicateComplaintId: data.duplicateComplaintId,
        fraudSignals: data.fraudSignals,
        timelineEntries: {
          create: {
            eventType: "complaint.ai_enriched",
            title: "AI enrichment completed",
            metadata: {
              aiCategory: data.aiCategory ?? null,
              aiPriority: data.aiPriority ?? null,
              aiConfidence: data.aiConfidence ?? null,
              departmentId: data.departmentId ?? null,
              duplicateScore: data.duplicateScore ?? null,
              fraudScore: data.fraudScore ?? null,
              isSuspicious: data.isSuspicious ?? null
            }
          }
        }
      },
      include: complaintDetailInclude
    });
  }
}
