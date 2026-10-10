//* ./scripts/audit-assistant-knowledge-migration.ts

import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("\n====================================");
  console.log(" Assistant Knowledge DB Audit");
  console.log("====================================\n");

  const documentCount = await prisma.knowledgeDocument.count();
  const chunkCount = await prisma.knowledgeChunk.count();

  console.log("KnowledgeDocument rows :", documentCount);
  console.log("KnowledgeChunk rows    :", chunkCount);

  const extensions = await prisma.$queryRawUnsafe<
    Array<{ extname: string }>
  >(`
    SELECT extname
    FROM pg_extension
    WHERE extname = 'vector'
  `);

  console.log(
    "pgvector extension     :",
    extensions.length > 0 ? "✅ EXISTS" : "❌ MISSING",
  );

  const tables = await prisma.$queryRawUnsafe<
    Array<{ table_name: string }>
  >(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('KnowledgeDocument', 'KnowledgeChunk')
    ORDER BY table_name
  `);

  console.log("\nTables:");
  for (const table of tables) {
    console.log(`✅ ${table.table_name}`);
  }

  const indexes = await prisma.$queryRawUnsafe<
    Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>
  >(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('KnowledgeDocument', 'KnowledgeChunk')
    ORDER BY tablename, indexname
  `);

  console.log("\nIndexes:");
  for (const index of indexes) {
    console.log(`- ${index.indexname}`);
    console.log(`  ${index.indexdef}`);
  }

  const constraints = await prisma.$queryRawUnsafe<
    Array<{
      table_name: string;
      constraint_name: string;
      constraint_type: string;
    }>
  >(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('KnowledgeDocument', 'KnowledgeChunk')
    ORDER BY tc.table_name, tc.constraint_name
  `);

  console.log("\nConstraints:");
  for (const constraint of constraints) {
    console.log(
      `- ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`,
    );
  }

  const embeddingColumn = await prisma.$queryRawUnsafe<
    Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>
  >(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'KnowledgeChunk'
      AND column_name = 'embedding'
  `);

  console.log("\nEmbedding column:");
  console.log(
    embeddingColumn.length > 0
      ? embeddingColumn[0]
      : "❌ embedding column missing",
  );

  const migration = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
    }>
  >(`
    SELECT migration_name, checksum, finished_at
    FROM "_prisma_migrations"
    WHERE migration_name = '20260913120000_add_assistant_knowledge'
  `);

  console.log("\nMigration record:");
  console.log(migration[0] ?? "❌ missing");

  console.log("\n====================================");
  console.log(" Audit complete");
  console.log("====================================\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });