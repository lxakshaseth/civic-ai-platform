import { Prisma } from "@prisma/client";

import { prisma } from "database/clients/prisma";

const suspiciousComplaintSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  category: true,
  aiCategory: true,
  priority: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  duplicateScore: true,
  fraudScore: true,
  isSuspicious: true,
  duplicateComplaintId: true,
  fraudSignals: true,
  createdAt: true,
  citizen: {
    select: {
      id: true,
      fullName: true,
      email: true
    }
  },
  department: {
    select: {
      id: true,
      name: true
    }
  },
  assignedEmployee: {
    select: {
      id: true,
      fullName: true,
      email: true
    }
  }
} as const;

export class FraudRepository {
  findComplaintsForHeuristics(since: Date) {
    return prisma.complaint.findMany({
      where: {
        createdAt: {
          gte: since
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        aiCategory: true,
        citizenId: true,
        locationAddress: true,
        latitude: true,
        longitude: true,
        createdAt: true
      }
    });
  }

  listAlerts(filters?: {
    departmentId?: string;
    status?: string;
    limit?: number;
    minScore?: number;
  }) {
    return prisma.complaint.findMany({
      where: {
        isSuspicious: true,
        ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
        OR: [
          {
            duplicateScore: {
              gte: filters?.minScore ?? 0.6
            }
          },
          {
            fraudScore: {
              gte: filters?.minScore ?? 0.6
            }
          }
        ]
      },
      orderBy: [{ fraudScore: "desc" }, { duplicateScore: "desc" }, { createdAt: "desc" }],
      take: filters?.limit ?? 50,
      select: suspiciousComplaintSelect
    });
  }

  async getSummary(filters?: { departmentId?: string }) {
    const [totalAlerts, duplicateAlerts, averageFraud, averageDuplicate] = await Promise.all([
      prisma.complaint.count({
        where: {
          isSuspicious: true,
          ...(filters?.departmentId ? { departmentId: filters.departmentId } : {})
        }
      }),
      prisma.complaint.count({
        where: {
          duplicateScore: {
            gte: 0.72
          },
          ...(filters?.departmentId ? { departmentId: filters.departmentId } : {})
        }
      }),
      prisma.complaint.aggregate({
        where: {
          isSuspicious: true,
          ...(filters?.departmentId ? { departmentId: filters.departmentId } : {})
        },
        _avg: {
          fraudScore: true
        }
      }),
      prisma.complaint.aggregate({
        where: {
          isSuspicious: true,
          ...(filters?.departmentId ? { departmentId: filters.departmentId } : {})
        },
        _avg: {
          duplicateScore: true
        }
      })
    ]);

    return {
      totalAlerts,
      duplicateAlerts,
      averageFraudScore: averageFraud._avg.fraudScore ?? 0,
      averageDuplicateScore: averageDuplicate._avg.duplicateScore ?? 0
    };
  }
}
