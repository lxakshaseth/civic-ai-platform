import { UserRole } from "@prisma/client";

import type { TicketListRecord, TicketRecord } from "./ticket.repository";

type PresentableTicket = TicketRecord | TicketListRecord;
type PresentationOptions = {
  viewerRole: UserRole;
};

const PINCODE_PATTERN = /\b\d{4,10}\b/;

const extractPincode = (locationAddress?: string | null) =>
  locationAddress?.match(PINCODE_PATTERN)?.[0] ?? null;

const deriveArea = (locationAddress?: string | null, pincode?: string | null) => {
  const parts =
    locationAddress
      ?.split(",")
      .map((part) => part.trim().replace(PINCODE_PATTERN, "").trim())
      .filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return parts.slice(-2).join(", ");
  }

  if (parts[0]) {
    return parts[0];
  }

  return pincode ? `PIN ${pincode}` : null;
};

const presentUserSummary = <
  TUser extends {
    id: string;
    fullName: string;
    role: UserRole;
    departmentId: string | null;
  } | null
>(
  user: TUser
) =>
  user
    ? {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId
      }
    : null;

export const presentTicket = <TTicket extends PresentableTicket>(
  ticket: TTicket,
  options: PresentationOptions
) => {
  const pincode = extractPincode(ticket.complaint.locationAddress);
  const area = deriveArea(ticket.complaint.locationAddress, pincode);

  return {
    id: ticket.id,
    complaintId: ticket.complaintId,
    message: ticket.message,
    status: ticket.status,
    createdAt: ticket.createdAt,
    raisedBy: presentUserSummary(ticket.raisedBy),
    complaint: {
      id: ticket.complaint.id,
      title: ticket.complaint.title,
      status: ticket.complaint.status,
      area,
      pincode,
      department: ticket.complaint.department,
      assignedEmployee: presentUserSummary(ticket.complaint.assignedEmployee),
      citizen:
        options.viewerRole === UserRole.CITIZEN
          ? null
          : presentUserSummary(ticket.complaint.citizen)
    }
  };
};

export const presentTickets = <TTicket extends PresentableTicket>(
  tickets: TTicket[],
  options: PresentationOptions
) => tickets.map((ticket) => presentTicket(ticket, options));
