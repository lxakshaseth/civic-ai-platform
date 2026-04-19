import { z } from "zod";

import { TICKET_STATUSES } from "./ticket.types";

export const createTicketSchema = z.object({
  complaintId: z.string().uuid(),
  message: z.string().trim().min(5).max(1000)
});

export const ticketComplaintParamsSchema = z.object({
  complaintId: z.string().uuid()
});

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const ticketListQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional()
});
