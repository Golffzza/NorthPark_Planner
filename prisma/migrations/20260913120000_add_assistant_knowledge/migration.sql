CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "KnowledgeDocument" (
  "id" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "parkId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "embedding" vector(768) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeDocument_sourceType_sourceEntityId_key" ON "KnowledgeDocument"("sourceType", "sourceEntityId");
CREATE INDEX "KnowledgeDocument_parkId_idx" ON "KnowledgeDocument"("parkId");
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_ordinal_key" ON "KnowledgeChunk"("documentId", "ordinal");
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
