import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";
import { sendSuccess } from "utils/api-response";

import { AdminService } from "../admin/admin.service";
import { ComplaintsService } from "./complaint.service";

const complaintsService = new ComplaintsService();
const adminService = new AdminService();

const getFieldFiles = (req: Request, ...fieldNames: string[]) => {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files) {
    const filesByField = req.files as Record<string, Express.Multer.File[]>;
    const collectedFiles = fieldNames.flatMap((fieldName) => {
      const files = filesByField[fieldName];
      return Array.isArray(files) ? files : [];
    });

    if (collectedFiles.length) {
      return collectedFiles;
    }
  }

  return req.file ? [req.file] : [];
};

const getFieldFile = (req: Request, ...fieldNames: string[]) => getFieldFiles(req, ...fieldNames)[0];

export class ComplaintsController {
  async analyzeDraft(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const analysis = complaintsService.analyzeComplaintDraft(req.body);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint analysis generated",
      data: analysis
    });
  }

  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.createComplaint(
      req.body,
      req.user.id,
      getFieldFiles(req, "images", "image"),
      {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint created",
      data: complaint
    });
  }

  async list(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await complaintsService.listComplaints(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaints fetched",
      data: complaints
    });
  }

  async listAdminIssues(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await complaintsService.listAdminIssues(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Admin issues fetched",
      data: complaints
    });
  }

  async listUnassigned(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await adminService.listUnassignedComplaints(req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Unassigned complaints fetched",
      data: complaints
    });
  }

  async listEmployeeTasks(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await complaintsService.listEmployeeTasks(req.user, req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Employee tasks fetched",
      data: complaints
    });
  }

  async listNearby(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaints = await complaintsService.listNearbyComplaints(
      req.user,
      req.query as unknown as {
        lat: number;
        lng: number;
        radiusKm?: number;
        limit?: number;
      }
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Nearby complaints fetched",
      data: complaints.map((item) => ({
        ...item.complaint,
        distanceKm: item.distanceKm
      }))
    });
  }

  async getById(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.getByIdForViewer(req.params.id, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint fetched",
      data: complaint
    });
  }

  async updateStatus(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.updateStatus(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint status updated",
      data: complaint
    });
  }

  async submitProof(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const proofSubmission = await complaintsService.submitProof(
      req.params.id,
      req.body,
      req.user,
      req.file,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint proof submitted",
      data: {
        complaint: proofSubmission.complaint,
        evidence: proofSubmission.evidence
      }
    });
  }

  async complete(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const completion = await complaintsService.completeComplaint(
      req.params.id,
      req.body,
      req.user,
      getFieldFiles(req, "proofImages"),
      getFieldFile(req, "invoice"),
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    );

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint marked as completed",
      data: {
        complaint: completion.complaint,
        evidence: completion.evidence
      }
    });
  }

  async assign(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.assignComplaint(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint assigned",
      data: complaint
    });
  }

  async assignFromBody(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const { complaintId, ...assignment } = req.body;
    const complaint = await complaintsService.assignComplaint(complaintId, assignment, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint assigned",
      data: complaint
    });
  }

  async assignTicket(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await adminService.assignTicket(req.user, req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint assigned",
      data: complaint
    });
  }

  async verify(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.verifyComplaint(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint verification completed",
      data: complaint
    });
  }

  async timeline(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const timeline = await complaintsService.getTimeline(req.params.id, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint timeline fetched",
      data: timeline
    });
  }

  async addComment(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const comment = await complaintsService.addComment(req.params.id, req.body, req.user);

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint comment added",
      data: comment
    });
  }

  async listComments(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const comments = await complaintsService.listComments(req.params.id, req.user);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint comments fetched",
      data: comments
    });
  }

  async reopen(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const complaint = await complaintsService.reopenComplaint(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint reopened",
      data: complaint
    });
  }

  async feedback(req: Request, res: Response) {
    if (!req.user) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
    }

    const feedback = await complaintsService.submitFeedback(req.params.id, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return sendSuccess(res, StatusCodes.CREATED, {
      message: "Complaint feedback submitted",
      data: feedback
    });
  }
}
