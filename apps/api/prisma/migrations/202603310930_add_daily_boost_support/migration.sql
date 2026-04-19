CREATE TYPE "DailyBoostType" AS ENUM ('JOKE', 'THOUGHT', 'TIP', 'QUOTE');

CREATE TYPE "DailyBoostMood" AS ENUM ('HAPPY', 'STRESS', 'ANGRY');

CREATE TABLE "DailyBoostContent" (
    "id" TEXT NOT NULL,
    "type" "DailyBoostType" NOT NULL,
    "mood" "DailyBoostMood" NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "pincode" TEXT,
    "content" TEXT NOT NULL,
    "emoji" TEXT,
    "prompt" TEXT,
    "model" TEXT,
    "source" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBoostContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_content_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_likes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DailyBoostContent_type_mood_language_createdAt_idx" ON "DailyBoostContent"("type", "mood", "language", "createdAt");
CREATE INDEX "DailyBoostContent_pincode_createdAt_idx" ON "DailyBoostContent"("pincode", "createdAt");
CREATE INDEX "saved_content_userId_createdAt_idx" ON "saved_content"("userId", "createdAt");
CREATE INDEX "user_likes_userId_createdAt_idx" ON "user_likes"("userId", "createdAt");

CREATE UNIQUE INDEX "saved_content_userId_contentId_key" ON "saved_content"("userId", "contentId");
CREATE UNIQUE INDEX "user_likes_userId_contentId_key" ON "user_likes"("userId", "contentId");

ALTER TABLE "saved_content"
ADD CONSTRAINT "saved_content_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "saved_content"
ADD CONSTRAINT "saved_content_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "DailyBoostContent"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "user_likes"
ADD CONSTRAINT "user_likes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "user_likes"
ADD CONSTRAINT "user_likes_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "DailyBoostContent"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
