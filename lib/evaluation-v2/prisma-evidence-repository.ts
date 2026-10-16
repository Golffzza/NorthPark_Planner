import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { EvidenceRecord, EvidenceReview } from "./trusted-evidence";
import type { EvidenceAuditEvent, EvidenceRepository, EvidenceRevision } from "./evidence-data-contract";

/** E5.3 server-only read adapter. Requires prisma generate + approved additive migration. */
type PrismaEvidenceDb = Pick<PrismaClient, "parkEvidenceRevision" | "parkEvidenceAuditEvent">;

const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function parseRecord(raw: unknown): EvidenceRecord {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("INVALID_EVIDENCE_PAYLOAD");
  const candidate = raw as Record<string, unknown>;
  if (!candidate.review || typeof candidate.review !== "object" || Array.isArray(candidate.review))
    throw Error("INVALID_EVIDENCE_REVIEW");
  const review = candidate.review as Record<string, unknown>;
  for (const field of ["reviewedAt", "effectiveFrom", "effectiveTo"]) {
    if (!validDate(review[field])) throw Error("INVALID_EVIDENCE_DATE");
  }
  const hydratedReview = { ...review, reviewedAt: new Date(review.reviewedAt as string),
    effectiveFrom: new Date(review.effectiveFrom as string),
    effectiveTo: new Date(review.effectiveTo as string) } as unknown as EvidenceReview;
  const result = { ...candidate, review: hydratedReview } as unknown as EvidenceRecord;
  if (!["ENTRANCE", "SCHEDULE", "PERMISSION", "LAST_MILE"].includes(result.kind))
    throw Error("INVALID_EVIDENCE_KIND");
  return result;
}

export function createPrismaEvidenceRepository(db: PrismaEvidenceDb): EvidenceRepository {
  return {
    async loadRevisions(parkId: string): Promise<readonly EvidenceRevision[]> {
      const rows = await db.parkEvidenceRevision.findMany({
        where: { parkId }, orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
      });
      return rows.map((row) => {
        const evidence = parseRecord(row.payload);
        if (evidence.kind !== row.kind || evidence.parkId !== row.parkId)
          throw Error("EVIDENCE_IDENTITY_MISMATCH");
        return { revisionId: row.id, parkId: row.parkId, evidence,
          recordedAt: row.recordedAt, supersedesRevisionId: row.supersedesId };
      });
    },
    async loadAuditEvents(parkId: string): Promise<readonly EvidenceAuditEvent[]> {
      const rows = await db.parkEvidenceAuditEvent.findMany({
        where: { revision: { parkId } },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      });
      return rows.map(row => ({ eventId: row.id, revisionId: row.revisionId,
        actorUserId: row.actorUserId, action: row.action, occurredAt: row.occurredAt,
        note: row.note }));
    },
  };
}
