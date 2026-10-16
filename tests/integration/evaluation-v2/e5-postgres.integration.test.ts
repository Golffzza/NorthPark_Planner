import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertIsolatedE5Database } from "@/lib/evaluation-v2/e5-test-database-guard";
import { createPrismaEvidenceReviewStore } from "@/lib/evaluation-v2/prisma-evidence-review-store";
import { createPrismaConsistentEvidenceRepository } from "@/lib/evaluation-v2/prisma-evidence-repository";
import { loadReviewedEvidenceSnapshot } from "@/lib/evaluation-v2/evidence-data-contract";

const enabled = process.env.RUN_E5_PG_INTEGRATION === "1";
describe.skipIf(!enabled)("E5.4 isolated PostgreSQL integration (opt-in)", () => {
  let db: PrismaClient;
  let userId = "";
  let parkId = "";
  let revisionId = "";
  beforeAll(async () => {
    const connectionString = assertIsolatedE5Database(
      process.env.E5_TEST_DATABASE_URL, process.env.DATABASE_URL);
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = "e5-" + crypto.randomUUID();
    const user = await db.user.create({ data: { displayName: suffix, role: "ADMIN" } });
    userId = user.id;
    const park = await db.park.create({ data: { slug: suffix, nameTh: "E5 fixture only",
      province: "TEST", openTime: "08:00", closeTime: "17:00",
      description: "Disposable integration fixture; not real park evidence" } });
    parkId = park.id;
    await db.parkEvidenceAuthority.create({ data: {
      parkId, userId, grantedById: userId, canReview: true,
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveTo: new Date("2030-01-01T00:00:00Z"),
    } });
    const revision = await db.parkEvidenceRevision.create({ data: {
      parkId, recordedById: userId, kind: "ENTRANCE", entityKey: "synthetic-gate",
      payload: { kind: "ENTRANCE", parkId, entranceId: "synthetic-gate",
        latitude: 18, longitude: 99, review: {
          evidenceId: suffix, sourceId: "FIXTURE_ONLY", sourceUrl: "https://example.org",
          reviewedBy: "untrusted", reviewedAt: "2026-01-01T00:00:00.000Z",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: "2030-01-01T00:00:00.000Z", status: "PENDING",
        },
      },
    } });
    revisionId = revision.id;
  });
  // Append-only E5 evidence history cannot be deleted. All fixture rows remain in
  // the disposable test database. Discard the container to remove them.
  afterAll(async () => { if (db) await db.$disconnect(); });
  it("concurrent approvals never commit more than one approval event", async () => {
    const uniqueKey = "race-" + crypto.randomUUID();
    const competing = await db.parkEvidenceRevision.create({ data: {
      parkId, recordedById: userId, kind: "ENTRANCE", entityKey: uniqueKey,
      payload: { kind: "ENTRANCE", parkId, entranceId: uniqueKey,
        latitude: 18, longitude: 99, review: {
          evidenceId: uniqueKey, sourceId: "FIXTURE_ONLY", sourceUrl: "https://example.org",
          reviewedBy: "untrusted", reviewedAt: "2026-01-01T00:00:00.000Z",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: "2030-01-01T00:00:00.000Z", status: "PENDING",
        } },
    } });
    try {
      const store = createPrismaEvidenceReviewStore(db, userId);
      const actor = { userId, role: "ADMIN" as const, canReviewParkEvidence: true };
      const attempts = await Promise.all(Array.from({ length: 2 }, (_, index) =>
        store.transactionReview({ command: {
          actor, revisionId: competing.id, action: "APPROVED",
          occurredAt: new Date(Date.now() + index), note: "race test",
        }, validate: () => ({ status: "DENIED" as const, reason: "untrusted callback" }) })));
      expect(attempts.filter(outcome => outcome.status === "ACCEPTED")).toHaveLength(1);
      const approvals = await db.parkEvidenceAuditEvent.count({
        where: { revisionId: competing.id, action: "APPROVED" },
      });
      expect(approvals).toBe(1);
    } finally {
      // Evidence history is append-only; leave the synthetic revision for container disposal.
    }
  });
  it("rejects a fake admin actor without database authority", async () => {
    const outsider = await db.user.create({ data: {
      displayName: "e5-outsider-" + crypto.randomUUID(), role: "USER",
    } });
    try {
      const actor = { userId: outsider.id, role: "ADMIN" as const,
        canReviewParkEvidence: true };
      const store = createPrismaEvidenceReviewStore(db, outsider.id);
      const result = await store.transactionReview({ command: {
        actor, revisionId, action: "APPROVED", occurredAt: new Date(), note: "fake admin",
      }, validate: () => ({ status: "ACCEPTED" as const, event: {
        eventId: "forged", revisionId, actorUserId: outsider.id, action: "APPROVED" as const,
        occurredAt: new Date(), note: "forged",
      } }) });
      expect(result).toMatchObject({ status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" });
      expect(await db.parkEvidenceAuditEvent.count({ where: {
        revisionId, action: "APPROVED",
      } })).toBe(0);
    } finally {
      await db.user.delete({ where: { id: outsider.id } });
    }
  });
  it("denies a DB admin if park evidence authority is disabled", async () => {
    await db.parkEvidenceAuthority.updateMany({
      where: { parkId, userId }, data: { canReview: false },
    });
    try {
      const store = createPrismaEvidenceReviewStore(db, userId);
      const outcome = await store.transactionReview({
        command: { actor: { userId, role: "ADMIN", canReviewParkEvidence: true },
          revisionId, action: "APPROVED", occurredAt: new Date(),
          note: "disabled authority fixture" },
        validate: () => ({ status: "DENIED", reason: "untrusted" }),
      });
      expect(outcome).toMatchObject({ status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" });
      expect(await db.parkEvidenceAuditEvent.count({ where: {
        revisionId, action: "APPROVED",
      } })).toBe(0);
    } finally {
      await db.parkEvidenceAuthority.updateMany({
        where: { parkId, userId }, data: { canReview: true },
      });
    }
  });
  it("persists a single approval, supports revocation, and reads both under one snapshot", async () => {
    const store = createPrismaEvidenceReviewStore(db, userId);
    const actor = { userId, role: "USER" as const, canReviewParkEvidence: false };
    // This actor object is not trusted. The store must load ADMIN + scope from the DB.
    const approved = await store.transactionReview({ command: {
      actor, revisionId, action: "APPROVED", occurredAt: new Date(), note: "fixture approval",
    }, validate: () => ({ status: "DENIED", reason: "caller callback untrusted" }) });
    expect(approved.status).toBe("ACCEPTED");
    const repo = createPrismaConsistentEvidenceRepository(db);
    const snapshot = await loadReviewedEvidenceSnapshot({
      repository: repo, parkId, evaluatedAt: new Date(), registryVersion: "TEST_ONLY",
    });
    expect(snapshot.status).toBe("READY");
    if (snapshot.status === "READY") expect(snapshot.snapshot.records).toHaveLength(1);
    const revoked = await store.transactionReview({ command: {
      actor, revisionId, action: "REVOKED", occurredAt: new Date(), note: "fixture revocation",
    }, validate: () => ({ status: "DENIED", reason: "caller callback untrusted" }) });
    expect(revoked.status).toBe("ACCEPTED");
    const after = await loadReviewedEvidenceSnapshot({
      repository: repo, parkId, evaluatedAt: new Date(), registryVersion: "TEST_ONLY",
    });
    expect(after.status).toBe("READY");
    if (after.status === "READY") expect(after.snapshot.records).toHaveLength(0);
  });
});
