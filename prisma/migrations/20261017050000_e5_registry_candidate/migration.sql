-- E5.4 CANDIDATE: additive evidence registry schema.
-- Manually drafted from prisma/schema.prisma; Prisma diff and test DB verification required.
-- No existing tables altered; NO DATA BACKFILL; not applied by this commit.
CREATE TYPE "ParkEvidenceKind" AS ENUM ('ENTRANCE', 'SCHEDULE', 'PERMISSION', 'LAST_MILE');
CREATE TYPE "ParkEvidenceAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REVOKED');

CREATE TABLE "ParkEvidenceRevision" (
  "id" TEXT NOT NULL,
  "parkId" TEXT NOT NULL,
  "kind" "ParkEvidenceKind" NOT NULL,
  "entityKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "supersedesId" TEXT,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParkEvidenceRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParkEvidenceAuditEvent" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" "ParkEvidenceAction" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT NOT NULL,
  CONSTRAINT "ParkEvidenceAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParkEvidenceAuthority" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parkId" TEXT NOT NULL,
  "canReview" BOOLEAN NOT NULL DEFAULT false,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3) NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParkEvidenceAuthority_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParkEvidenceRevision_supersedesId_key" ON "ParkEvidenceRevision"("supersedesId");
CREATE INDEX "ParkEvidenceRevision_parkId_kind_entityKey_idx" ON "ParkEvidenceRevision"("parkId", "kind", "entityKey");
CREATE INDEX "ParkEvidenceRevision_parkId_recordedAt_idx" ON "ParkEvidenceRevision"("parkId", "recordedAt");
CREATE INDEX "ParkEvidenceAuditEvent_revisionId_occurredAt_id_idx" ON "ParkEvidenceAuditEvent"("revisionId", "occurredAt", "id");
CREATE INDEX "ParkEvidenceAuditEvent_actorUserId_occurredAt_idx" ON "ParkEvidenceAuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "ParkEvidenceAuthority_userId_parkId_effectiveFrom_effective_idx" ON "ParkEvidenceAuthority"("userId", "parkId", "effectiveFrom", "effectiveTo");
CREATE INDEX "ParkEvidenceAuthority_parkId_canReview_idx" ON "ParkEvidenceAuthority"("parkId", "canReview");

ALTER TABLE "ParkEvidenceRevision" ADD CONSTRAINT "ParkEvidenceRevision_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceRevision" ADD CONSTRAINT "ParkEvidenceRevision_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "ParkEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceRevision" ADD CONSTRAINT "ParkEvidenceRevision_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceAuditEvent" ADD CONSTRAINT "ParkEvidenceAuditEvent_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "ParkEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceAuditEvent" ADD CONSTRAINT "ParkEvidenceAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceAuthority" ADD CONSTRAINT "ParkEvidenceAuthority_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceAuthority" ADD CONSTRAINT "ParkEvidenceAuthority_parkId_fkey"
  FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParkEvidenceAuthority" ADD CONSTRAINT "ParkEvidenceAuthority_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
