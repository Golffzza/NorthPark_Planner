//* ./scripts/find-original-migration.ts

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import { prisma } from "../lib/db/prisma";

const MIGRATION_NAME =
  "20260913120000_add_assistant_knowledge";

const MIGRATION_PATH =
  "prisma/migrations/20260913120000_add_assistant_knowledge/migration.sql";

function sha256(content: Buffer | string): string {
  return createHash("sha256")
    .update(content)
    .digest("hex");
}

function git(args: string[]): Buffer {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      checksum: string;
    }>
  >(
    `
      SELECT migration_name, checksum
      FROM "_prisma_migrations"
      WHERE migration_name = $1
    `,
    MIGRATION_NAME,
  );

  if (rows.length === 0) {
    throw new Error(
      `Migration ${MIGRATION_NAME} not found in database`,
    );
  }

  const dbChecksum = rows[0].checksum;

  console.log("\n====================================");
  console.log(" Find original Prisma migration");
  console.log("====================================\n");

  console.log("DB checksum:");
  console.log(dbChecksum);

  const logOutput = git([
    "log",
    "--follow",
    "--format=%H",
    "--",
    MIGRATION_PATH,
  ])
    .toString("utf8")
    .trim();

  const commits = logOutput
    .split(/\r?\n/)
    .map((commit) => commit.trim())
    .filter(Boolean);

  console.log(`\nFound ${commits.length} commit(s) touching migration.\n`);

  let found = false;

  for (const commit of commits) {
    let content: Buffer;

    try {
      content = git([
        "show",
        `${commit}:${MIGRATION_PATH}`,
      ]);
    } catch {
      continue;
    }

    const checksum = sha256(content);
    const shortCommit = commit.slice(0, 8);

    console.log(
      `${checksum === dbChecksum ? "✅" : "❌"} ${shortCommit}  ${checksum}`,
    );

    if (checksum === dbChecksum) {
      found = true;

      console.log("\n====================================");
      console.log("✅ MATCH FOUND");
      console.log("====================================");
      console.log(`Commit : ${commit}`);
      console.log(`Path   : ${MIGRATION_PATH}`);
      console.log(`SHA256 : ${checksum}`);

      const subject = git([
        "show",
        "-s",
        "--format=%s",
        commit,
      ])
        .toString("utf8")
        .trim();

      console.log(`Commit message: ${subject}`);

      break;
    }
  }

  if (!found) {
    console.log("\n====================================");
    console.log("⚠️ NO MATCH IN GIT HISTORY");
    console.log("====================================");
    console.log(
      "เวอร์ชันที่ถูก apply ลงฐานข้อมูลอาจไม่เคยถูก commit หรือถูก rewrite จาก Git history",
    );
    console.log(
      "ยังไม่ควร reset หรือแก้ checksum ใน _prisma_migrations",
    );
  }
}

main()
  .catch((error) => {
    console.error("\n❌ Failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });