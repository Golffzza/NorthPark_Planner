//* ./scripts/check-prisma-migration.ts

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../lib/db/prisma";

const MIGRATION_NAME =
  "20260913120000_add_assistant_knowledge";

const APPENDED_MARKER =
  "-- Add the single-column lookup index used by focused park retrieval.";

function sha256(value: Buffer | string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
    }>
  >(
    `
      SELECT migration_name, checksum, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = $1
    `,
    MIGRATION_NAME,
  );

  if (rows.length === 0) {
    throw new Error(
      `Migration ${MIGRATION_NAME} not found in _prisma_migrations`,
    );
  }

  const dbMigration = rows[0];

  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    MIGRATION_NAME,
    "migration.sql",
  );

  const fileBuffer = await readFile(migrationPath);
  const fileText = fileBuffer.toString("utf8");

  const currentChecksum = sha256(fileBuffer);

  console.log("\n=== Prisma migration drift check ===\n");

  console.log("Migration     :", dbMigration.migration_name);
  console.log("Finished at   :", dbMigration.finished_at);
  console.log("DB checksum   :", dbMigration.checksum);
  console.log("File checksum :", currentChecksum);
  console.log(
    "Current match :",
    currentChecksum === dbMigration.checksum,
  );

  const markerIndex = fileText.indexOf(APPENDED_MARKER);

  if (markerIndex === -1) {
    console.log(
      "\n❌ Suspected appended block marker was not found.",
    );
    return;
  }

  /**
   * ตัดทุกอย่างตั้งแต่ comment ที่สงสัยว่าเพิ่มทีหลังออก
   */
  const beforeAppendedBlock = fileText.slice(
    0,
    markerIndex,
  );

  /**
   * SHA256 ขึ้นกับ newline ตอนท้ายไฟล์ด้วย
   * จึงลอง candidate หลายรูปแบบโดยไม่แก้ไฟล์จริง
   */
  const trimmed = beforeAppendedBlock.replace(
    /[\r\n]+$/,
    "",
  );

  const candidates = [
    {
      name: "No trailing newline",
      content: trimmed,
    },
    {
      name: "LF ending",
      content: `${trimmed}\n`,
    },
    {
      name: "CRLF ending",
      content: `${trimmed}\r\n`,
    },
    {
      name: "Two LF endings",
      content: `${trimmed}\n\n`,
    },
    {
      name: "Two CRLF endings",
      content: `${trimmed}\r\n\r\n`,
    },
  ];

  console.log(
    "\n=== Candidate checksums without appended index block ===\n",
  );

  let matched:
    | {
        name: string;
        content: string;
        checksum: string;
      }
    | undefined;

  for (const candidate of candidates) {
    const checksum = sha256(candidate.content);

    const isMatch =
      checksum === dbMigration.checksum;

    console.log(
      `${isMatch ? "✅" : "❌"} ${candidate.name}`,
    );
    console.log(`   ${checksum}`);

    if (isMatch) {
      matched = {
        ...candidate,
        checksum,
      };
    }
  }

  if (matched) {
    console.log("\n====================================");
    console.log("✅ ORIGINAL MIGRATION IDENTIFIED");
    console.log("====================================");

    console.log(
      `Matched candidate: ${matched.name}`,
    );

    console.log(
      "\nThe appended KnowledgeDocument_sourceEntityId index block",
    );

    console.log(
      "is very likely the modification that caused Prisma migration drift.",
    );

    console.log(
      "\nยังไม่ได้แก้ไฟล์หรือฐานข้อมูลใด ๆ",
    );
  } else {
    console.log("\n====================================");
    console.log("⚠️ NO CANDIDATE MATCHED");
    console.log("====================================");

    console.log(
      "ดังนั้นยังไม่ควรแก้ migration file",
    );

    console.log(
      "ไฟล์เดิมอาจมีการแก้ไขมากกว่า block ด้านท้าย",
    );
  }
}

main()
  .catch((error) => {
    console.error("\n❌ Check failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });