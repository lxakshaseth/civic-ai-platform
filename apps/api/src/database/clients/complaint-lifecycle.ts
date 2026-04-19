import { prisma } from "database/clients/prisma";

export const ensureComplaintLifecycleSchema = async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESOLVED';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFIED';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE';
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'TicketStatus'
      ) THEN
        CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Ticket" (
      "id" TEXT PRIMARY KEY,
      "complaintId" TEXT NOT NULL REFERENCES "Complaint"("id") ON DELETE CASCADE,
      "raisedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "message" TEXT NOT NULL,
      "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'Ticket_complaintId_createdAt_idx'
      ) THEN
        CREATE INDEX "Ticket_complaintId_createdAt_idx" ON "Ticket"("complaintId", "createdAt");
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'Ticket_raisedById_createdAt_idx'
      ) THEN
        CREATE INDEX "Ticket_raisedById_createdAt_idx" ON "Ticket"("raisedById", "createdAt");
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'Ticket_status_createdAt_idx'
      ) THEN
        CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Notification"
    ADD COLUMN IF NOT EXISTS "complaintId" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'Notification_complaintId_idx'
      ) THEN
        CREATE INDEX "Notification_complaintId_idx" ON "Notification"("complaintId");
      END IF;
    END
    $$;
  `);
};
