-- Add the single-column lookup index used by focused park retrieval.
-- The knowledge tables, constraints, and pgvector extension already exist
-- from 20260913120000_add_assistant_knowledge.

CREATE INDEX "KnowledgeDocument_sourceEntityId_idx"
ON "KnowledgeDocument"("sourceEntityId");
