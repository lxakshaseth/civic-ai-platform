import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { ComplaintsService } from "modules/complaint/complaint.service";
import { ProfileRepository } from "modules/profile/profile.repository";
import { queueNotificationJob } from "queues/jobs/notification.job";
import { AppError } from "shared/errors/app-error";

import {
  ComplaintTicketAccessRecord,
  TicketRecord,
  TicketsRepository
} from "./ticket.repository";
import type { TicketStatus } from "./ticket.types";

type Actor = {
  id: string;
  email: string;
  role: UserRole;
};

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

const TICKET_STATUS = {
  PENDING: "PENDING" as TicketStatus,
  APPROVED: "APPROVED" as TicketStatus,
  REJECTED: "REJECTED" as TicketStatus
};

export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository = new TicketsRepository(),
    private readonly complaintsService: ComplaintsService = new ComplaintsService(),
    private readonly profileRepository: ProfileRepository = new ProfileRepository()
  ) {}

  async createTicket(
    input: {
      complaintId: string;
      message: string;
    },
    actor: Actor,
    _requestContext?: RequestContext
  ) {
    const complaint = await this.getComplaintOrThrow(input.complaintId);

    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Only citizens can raise tickets", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const citizenProfile = await this.profileRepository.findByEmail(actor.email);
    const citizenPincode = citizenProfile?.pincode?.trim() ?? null;
    const complaintPincode = complaint.pincode?.trim() ?? null;

    if (!citizenPincode) {
      throw new AppError("Invalid pincode", StatusCodes.BAD_REQUEST, "PINCODE_REQUIRED");
    }

    if (!complaintPincode) {
      throw new AppError(
        "Complaint pincode is missing",
        StatusCodes.BAD_REQUEST,
        "COMPLAINT_PINCODE_MISSING"
      );
    }

    if (citizenPincode !== complaintPincode) {
      throw new AppError(
        "You can raise a ticket only for complaints in your pincode",
        StatusCodes.FORBIDDEN,
        "PINCODE_MISMATCH"
      );
    }

    const existingPendingCount = await this.ticketsRepository.countPendingByComplaintAndUser(
      input.complaintId,
      actor.id
    );

    if (existingPendingCount > 0) {
      throw new AppError(
        "A pending ticket already exists for this complaint",
        StatusCodes.CONFLICT,
        "TICKET_ALREADY_EXISTS"
      );
    }

    const ticket = await this.ticketsRepository.createTicket({
      complaintId: input.complaintId,
      raisedById: actor.id,
      message: input.message.trim()
    });
    const adminRecipients = await this.ticketsRepository.listAdminRecipients(complaint.departmentId);

    await Promise.allSettled(
      adminRecipients.map(({ id }) =>
        queueNotificationJob({
          userId: id,
          complaintId: complaint.id,
          type: "TICKET",
          title: "Citizen validation ticket raised",
          message: `Complaint ${complaint.id} received a new validation ticket from the same pincode.`,
          data: {
            complaintId: complaint.id,
            ticketId: ticket.id,
            status: ticket.status
          }
        })
      )
    );

    return ticket;
  }

  async listComplaintTickets(complaintId: string, actor: Actor) {
    const complaint = await this.getComplaintOrThrow(complaintId);
    this.ensureComplaintAccess(complaint, actor);
    return this.ticketsRepository.listByComplaint(complaintId);
  }

  async listTickets(
    actor: Actor,
    filters: {
      status?: TicketStatus;
    }
  ) {
    this.ensureAdmin(actor);
    return this.ticketsRepository.listMany(filters);
  }

  async approveTicket(id: string, actor: Actor, requestContext?: RequestContext) {
    this.ensureAdmin(actor);

    const existingTicket = await this.getTicketOrThrow(id);
    this.ensureTicketPending(existingTicket);

    const approvedTicket = await this.ticketsRepository.updateStatus(id, TICKET_STATUS.APPROVED);

    if (!approvedTicket) {
      throw new AppError("Ticket not found", StatusCodes.NOT_FOUND, "TICKET_NOT_FOUND");
    }

    await this.complaintsService.updateStatus(
      existingTicket.complaint.id,
      {
        status: "REOPENED",
        note: "Citizen validation ticket approved and complaint escalated."
      },
      actor,
      requestContext
    );

    await this.ticketsRepository.createEscalation({
      complaintId: existingTicket.complaint.id,
      ticketId: existingTicket.id,
      triggeredBy: actor.id,
      reason: existingTicket.message
    });

    const recipients = this.collectRecipients(existingTicket);

    await Promise.allSettled(
      recipients.map((userId) =>
        queueNotificationJob({
          userId,
          complaintId: existingTicket.complaint.id,
          type: "TICKET",
          title: "Ticket approved",
          message: `Complaint ${existingTicket.complaint.id} was escalated after ticket approval.`,
          data: {
            complaintId: existingTicket.complaint.id,
            ticketId: existingTicket.id,
            status: TICKET_STATUS.APPROVED
          }
        })
      )
    );

    return approvedTicket;
  }

  async rejectTicket(id: string, actor: Actor, _requestContext?: RequestContext) {
    this.ensureAdmin(actor);

    const existingTicket = await this.getTicketOrThrow(id);
    this.ensureTicketPending(existingTicket);

    const rejectedTicket = await this.ticketsRepository.updateStatus(id, TICKET_STATUS.REJECTED);

    if (!rejectedTicket) {
      throw new AppError("Ticket not found", StatusCodes.NOT_FOUND, "TICKET_NOT_FOUND");
    }

    const recipients = this.collectRecipients(existingTicket);

    await Promise.allSettled(
      recipients.map((userId) =>
        queueNotificationJob({
          userId,
          complaintId: existingTicket.complaint.id,
          type: "TICKET",
          title: "Ticket rejected",
          message: `The validation ticket for complaint ${existingTicket.complaint.id} was rejected.`,
          data: {
            complaintId: existingTicket.complaint.id,
            ticketId: existingTicket.id,
            status: TICKET_STATUS.REJECTED
          }
        })
      )
    );

    return rejectedTicket;
  }

  private async getComplaintOrThrow(complaintId: string) {
    const complaint = await this.ticketsRepository.findComplaintById(complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    return complaint;
  }

  private async getTicketOrThrow(id: string) {
    const ticket = await this.ticketsRepository.findById(id);

    if (!ticket) {
      throw new AppError("Ticket not found", StatusCodes.NOT_FOUND, "TICKET_NOT_FOUND");
    }

    return ticket;
  }

  private ensureAdmin(actor: Actor) {
    if (actor.role !== UserRole.DEPARTMENT_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private ensureComplaintAccess(complaint: ComplaintTicketAccessRecord, actor: Actor) {
    const isCitizenViewer = actor.role === UserRole.CITIZEN && complaint.citizenId === actor.id;
    const isAssignedEmployee =
      actor.role === UserRole.EMPLOYEE && complaint.assignedEmployeeId === actor.id;
    const isAdmin =
      actor.role === UserRole.DEPARTMENT_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isCitizenViewer && !isAssignedEmployee && !isAdmin) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }
  }

  private ensureTicketPending(ticket: TicketRecord) {
    if (ticket.status !== TICKET_STATUS.PENDING) {
      throw new AppError(
        "This ticket has already been reviewed",
        StatusCodes.CONFLICT,
        "TICKET_ALREADY_REVIEWED"
      );
    }
  }

  private collectRecipients(ticket: TicketRecord) {
    return [...new Set([ticket.raisedBy.id, ticket.complaint.citizenId, ticket.complaint.assignedEmployeeId])]
      .filter((userId): userId is string => Boolean(userId));
  }
}
