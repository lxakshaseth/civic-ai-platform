import { Prisma } from "@prisma/client";

import { prisma } from "database/clients/prisma";

const complaintAnalyticsSelect = {
  id: true,
  title: true,
  status: true,
  category: true,
  aiCategory: true,
  priority: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  isSuspicious: true,
  duplicateScore: true,
  fraudScore: true,
  createdAt: true,
  resolvedAt: true,
  closedAt: true,
  departmentId: true,
  assignedEmployeeId: true,
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
      email: true,
      departmentId: true
    }
  },
  feedback: {
    select: {
      rating: true,
      officerId: true,
      departmentId: true,
      createdAt: true
    }
  }
} as const;

export class AnalyticsRepository {
  listComplaints(where: Prisma.ComplaintWhereInput) {
    return prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: complaintAnalyticsSelect
    });
  }

  listDepartments(where?: Prisma.DepartmentWhereInput) {
    return prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true
      }
    });
  }
}
