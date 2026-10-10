//* ./scripts/reconcile-prisma-migration-checksum.ts

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../lib/db/prisma";

const MIGRATION_NAME =
  "20260913120000_add_assistant_knowledge";

/**
 * checksum ที่ DB มีอยู่ตอนนี้
 * ใช้เป็น safety guard เพื่อป้องกันการแก้ผิด migration
 */
const EXPECTED_OLD_CHECKSUM =
  "5f4e5cfb55d8c114839c4dfde20d884597402e943e1fb1041b820ad8b3dfa4e7";

function sha256(buffer: Buffer): string {
  return createHash("sha256")
    .update(buffer)
    .digest("hex");
}

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    MIGRATION_NAME,
    "migration.sql",
  );

  const migrationFile = await readFile(migrationPath);
  const newChecksum = sha256(migrationFile);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>
  >(
    `
      SELECT
        migration_name,
        checksum,
        finished_at,
        rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name = $1
    `,
    MIGRATION_NAME,
  );

  if (rows.length !== 1) {
    throw new Error(
      `Expected exactly one migration row, found ${rows.length}`,
    );
  }

  const migration = rows[0];

  console.log("\n====================================");
  console.log(" Prisma migration checksum reconcile");
  console.log("====================================\n");

  console.log("Migration    :", migration.migration_name);
  console.log("Old checksum :", migration.checksum);
  console.log("New checksum :", newChecksum);
  console.log("Finished at  :", migration.finished_at);
  console.log("Rolled back  :", migration.rolled_back_at);

  if (migration.checksum !== EXPECTED_OLD_CHECKSUM) {
    throw new Error(
      [
        "Safety check failed.",
        "The database checksum is not the value we previously audited.",
        `Expected: ${EXPECTED_OLD_CHECKSUM}`,
        `Actual:   ${migration.checksum}`,
      ].join("\n"),
    );
  }

  if (!migration.finished_at) {
    throw new Error(
      "Migration is not marked as finished. Refusing to reconcile.",
    );
  }

  if (migration.rolled_back_at) {
    throw new Error(
      "Migration is marked as rolled back. Refusing to reconcile.",
    );
  }

  if (migration.checksum === newChecksum) {
    console.log(
      "\n✅ Checksum already matches. Nothing to change.",
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "_prisma_migrations"
      SET checksum = $1
      WHERE migration_name = $2
        AND checksum = $3
    `,
    newChecksum,
    MIGRATION_NAME,
    EXPECTED_OLD_CHECKSUM,
  );

  const updatedRows = await prisma.$queryRawUnsafe<
    Array<{
      checksum: string;
    }>
  >(
    `
      SELECT checksum
      FROM "_prisma_migrations"
      WHERE migration_name = $1
    `,
    MIGRATION_NAME,
  );

  const updatedChecksum =
    updatedRows[0]?.checksum;

  if (updatedChecksum !== newChecksum) {
    throw new Error(
      "Checksum update verification failed.",
    );
  }

  console.log("\n✅ Checksum reconciled successfully.");
  console.log(
    "Only _prisma_migrations metadata was changed.",
  );
  console.log(
    "KnowledgeDocument / KnowledgeChunk data was not modified.",
  );
}

main()
  .catch((error) => {
    console.error("\n❌ Reconcile failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });