CREATE TYPE "ChatbotMessageRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TYPE "ChatbotResponseSource" AS ENUM ('KNOWLEDGE_BASE', 'AI', 'FALLBACK');

CREATE TABLE "ChatbotKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "normalizedQuestion" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatbotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "responseSource" "ChatbotResponseSource",
    "knowledgeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatbotKnowledgeEntry_normalizedQuestion_key" ON "ChatbotKnowledgeEntry"("normalizedQuestion");
CREATE INDEX "ChatbotKnowledgeEntry_category_createdAt_idx" ON "ChatbotKnowledgeEntry"("category", "createdAt");
CREATE INDEX "ChatbotMessage_userId_createdAt_idx" ON "ChatbotMessage"("userId", "createdAt");
CREATE INDEX "ChatbotMessage_knowledgeEntryId_idx" ON "ChatbotMessage"("knowledgeEntryId");

ALTER TABLE "ChatbotMessage"
ADD CONSTRAINT "ChatbotMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "ChatbotMessage"
ADD CONSTRAINT "ChatbotMessage_knowledgeEntryId_fkey"
FOREIGN KEY ("knowledgeEntryId") REFERENCES "ChatbotKnowledgeEntry"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
