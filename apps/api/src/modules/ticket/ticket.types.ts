export const TICKET_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
