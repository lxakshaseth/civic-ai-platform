import { prisma } from "database/clients/prisma";

export const ensureRealtimeChatSchema = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL REFERENCES "Complaint"("id") ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      message TEXT NOT NULL,
      translated_message TEXT,
      language VARCHAR(16) NOT NULL DEFAULT 'en',
      translated_language VARCHAR(16),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE chats
    ADD COLUMN IF NOT EXISTS translated_message TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE chats
    ADD COLUMN IF NOT EXISTS translated_language VARCHAR(16);
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE chats
    ADD COLUMN IF NOT EXISTS language VARCHAR(16) NOT NULL DEFAULT 'en';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE chats
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'chats_complaint_id_created_at_idx'
      ) THEN
        CREATE INDEX chats_complaint_id_created_at_idx ON chats(complaint_id, created_at);
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
          AND indexname = 'chats_receiver_id_created_at_idx'
      ) THEN
        CREATE INDEX chats_receiver_id_created_at_idx ON chats(receiver_id, created_at);
      END IF;
    END
    $$;
  `);
};
