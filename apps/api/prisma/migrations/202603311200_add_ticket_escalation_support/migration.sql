CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE';

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_complaintId_createdAt_idx" ON "Ticket"("complaintId", "createdAt");
CREATE INDEX "Ticket_raisedById_createdAt_idx" ON "Ticket"("raisedById", "createdAt");
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_complaintId_fkey"
FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_raisedById_fkey"
FOREIGN KEY ("raisedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
