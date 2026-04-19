const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const standardDepartments = [
  ['Public Works', 'Roads, potholes, and general civil infrastructure'],
  ['Solid Waste', 'Garbage collection and sanitation operations'],
  ['Water Board', 'Water supply, leakage, and pipeline issues'],
  ['Power & Utilities', 'Electricity and power infrastructure'],
  ['Street Lighting', 'Street lights and public lighting operations'],
  ['Traffic & Transport', 'Traffic signals, junctions, and parking enforcement'],
  ['Sewerage & Drainage', 'Drainage, sewage, and waterlogging response'],
  ['Parks & Horticulture', 'Parks, green spaces, and horticulture services'],
  ['Health Services', 'Public health, hygiene, and mosquito control'],
  ['Encroachment Control', 'Encroachment and municipal enforcement'],
  ['Municipal Revenue', 'General civic administration and fallback routing'],
  ['Emergency Response', 'Emergency and public safety operations'],
]

const statements = [
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_sanitary_feature BOOLEAN NOT NULL DEFAULT false;`,
  `UPDATE public.users
   SET profile_completed =
     CASE
       WHEN COALESCE(NULLIF(BTRIM(name), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(email), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(phone), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(gender), ''), NULL) IS NOT NULL
        AND date_of_birth IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(permanent_address), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(pincode), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(aadhar_number), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(BTRIM(pan_number), ''), NULL) IS NOT NULL
       THEN true
       ELSE false
     END;`,
  `ALTER TYPE "ComplaintStatus" ADD VALUE IF NOT EXISTS 'OPEN';`,
  `ALTER TYPE "ComplaintStatus" ADD VALUE IF NOT EXISTS 'REOPENED';`,
  `DO $$
   BEGIN
     CREATE TYPE "ChatbotMessageRole" AS ENUM ('USER', 'ASSISTANT');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;`,
  `DO $$
   BEGIN
     CREATE TYPE "ChatbotResponseSource" AS ENUM ('KNOWLEDGE_BASE', 'AI', 'FALLBACK');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "fraudScore" DOUBLE PRECISION;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "issueType" TEXT;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "urgencyScore" INTEGER;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "structuredAddress" JSONB;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "isSuspicious" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "fraudSignals" JSONB;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "duplicateComplaintId" TEXT;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "assignedEmployeeId" TEXT;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "reopenedCount" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "lastStatusChangedAt" TIMESTAMP;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP;`,
  `ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP;`,
  `UPDATE "Complaint"
   SET "lastStatusChangedAt" = COALESCE("lastStatusChangedAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP);`,
  `ALTER TABLE "Complaint"
   ALTER COLUMN "lastStatusChangedAt" SET DEFAULT CURRENT_TIMESTAMP;`,
  `UPDATE "Complaint" AS complaint
   SET "assignedEmployeeId" = latest."employeeId"
   FROM (
     SELECT DISTINCT ON ("complaintId") "complaintId", "employeeId"
     FROM "ComplaintAssignment"
     ORDER BY "complaintId", "createdAt" DESC
   ) AS latest
   WHERE complaint.id = latest."complaintId"
     AND complaint."assignedEmployeeId" IS NULL;`,
  `ALTER TABLE "ComplaintAssignment" ADD COLUMN IF NOT EXISTS "note" TEXT;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "reviewRemarks" TEXT;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "ocrConfidence" DOUBLE PRECISION;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "ocrFields" JSONB;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "invoiceVendorName" TEXT;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "invoiceAmount" NUMERIC(12, 2);`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "latitude" NUMERIC(10, 7);`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "longitude" NUMERIC(10, 7);`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "duplicateScore" DOUBLE PRECISION;`,
  `ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;`,
  `CREATE TABLE IF NOT EXISTS "ComplaintComment" (
     "id" TEXT PRIMARY KEY,
     "complaintId" TEXT NOT NULL,
     "userId" TEXT NOT NULL,
     "comment" TEXT NOT NULL,
     "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS "ComplaintTimelineEntry" (
     "id" TEXT PRIMARY KEY,
     "complaintId" TEXT NOT NULL,
     "eventType" TEXT NOT NULL,
     "title" TEXT NOT NULL,
     "description" TEXT,
     "metadata" JSONB,
     "createdById" TEXT,
     "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS "ComplaintFeedback" (
     "id" TEXT PRIMARY KEY,
     "complaintId" TEXT NOT NULL,
     "citizenId" TEXT NOT NULL,
     "departmentId" TEXT,
     "officerId" TEXT,
     "rating" INTEGER NOT NULL,
     "comment" TEXT,
     "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS "ChatbotKnowledgeEntry" (
     "id" TEXT PRIMARY KEY,
     "question" TEXT NOT NULL,
     "normalizedQuestion" TEXT NOT NULL,
     "answer" TEXT NOT NULL,
     "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
     "category" TEXT,
     "isSeed" BOOLEAN NOT NULL DEFAULT false,
     "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS "ChatbotMessage" (
     "id" TEXT PRIMARY KEY,
     "userId" TEXT NOT NULL,
     "role" "ChatbotMessageRole" NOT NULL,
     "content" TEXT NOT NULL,
     "responseSource" "ChatbotResponseSource",
     "knowledgeEntryId" TEXT,
     "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ComplaintFeedback_complaintId_key" ON "ComplaintFeedback"("complaintId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ChatbotKnowledgeEntry_normalizedQuestion_key" ON "ChatbotKnowledgeEntry"("normalizedQuestion");`,
  `CREATE INDEX IF NOT EXISTS "ComplaintComment_complaintId_createdAt_idx" ON "ComplaintComment"("complaintId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ComplaintTimelineEntry_complaintId_createdAt_idx" ON "ComplaintTimelineEntry"("complaintId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ComplaintFeedback_departmentId_createdAt_idx" ON "ComplaintFeedback"("departmentId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ComplaintFeedback_officerId_createdAt_idx" ON "ComplaintFeedback"("officerId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ChatbotKnowledgeEntry_category_createdAt_idx" ON "ChatbotKnowledgeEntry"("category", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ChatbotMessage_userId_createdAt_idx" ON "ChatbotMessage"("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ChatbotMessage_knowledgeEntryId_idx" ON "ChatbotMessage"("knowledgeEntryId");`,
]

async function ensureDepartments() {
  const existing = await prisma.department.count()

  if (existing > 0) {
    return
  }

  for (const [name, description] of standardDepartments) {
    await prisma.department.create({
      data: {
        name,
        description,
      },
    })
  }
}

async function ensureAdminAccess() {
  const superAdminCount = await prisma.user.count({
    where: { role: 'SUPER_ADMIN' },
  })

  if (superAdminCount > 0) {
    return
  }

  const fallbackAdmin = await prisma.user.findFirst({
    where: {
      role: 'DEPARTMENT_ADMIN',
      departmentId: null,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  })

  if (!fallbackAdmin) {
    return
  }

  await prisma.user.update({
    where: { id: fallbackAdmin.id },
    data: { role: 'SUPER_ADMIN' },
  })

  console.log(`Promoted ${fallbackAdmin.email} to SUPER_ADMIN for local admin access.`)
}

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  await ensureDepartments()
  await ensureAdminAccess()

  console.log('Runtime database repair completed successfully.')
}

main()
  .catch((error) => {
    console.error('Failed to repair runtime database.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
