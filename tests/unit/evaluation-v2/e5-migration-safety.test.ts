import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const path = join(process.cwd(), "prisma/migrations/20261017050000_e5_registry_candidate/migration.sql");
const sql = readFileSync(path, "utf8");
describe("E5.4 migration draft static safety assertions", () => {
  it("only creates the three candidate evidence registry tables", () => {
    const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(match => match[1]);
    expect(tables).toEqual([
      "ParkEvidenceRevision", "ParkEvidenceAuditEvent", "ParkEvidenceAuthority",
    ]);
    expect([...sql.matchAll(/CREATE TYPE "([^"]+)"/g)].map(match => match[1]))
      .toEqual(["ParkEvidenceKind", "ParkEvidenceAction"]);
  });
  it("never updates, deletes, drops, truncates or alters pre-existing tables", () => {
    const stripped = sql.replace(/--[^\n]*/g, "");
    // Match destructive SQL verbs only at the beginning of a statement.\n    // ON DELETE RESTRICT / ON UPDATE CASCADE are valid foreign-key actions.
    for (const statement of stripped.split(";").map(part => part.trim()).filter(Boolean)) {
      expect(statement).toMatch(/^(?:CREATE TYPE|CREATE TABLE|CREATE (?:UNIQUE )?INDEX|ALTER TABLE "ParkEvidence(?:Revision|AuditEvent|Authority)")(?:\s|$)/);\n      expect(statement).not.toMatch(/^(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT|ALTER TABLE "(?:User|Park|Trip|TripEvaluation)")\b/i);
    }
  });
});
