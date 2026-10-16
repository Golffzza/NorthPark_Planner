/** E5.1 candidate persistence boundary: no database writes or public request inputs. */
import type { EvidenceRecord, EvidenceReview, TrustedEvidenceSnapshot } from "./trusted-evidence";

export type EvidenceRevision = {
  revisionId: string;
  parkId: string;
  evidence: EvidenceRecord;
  recordedAt: Date;
  supersedesRevisionId: string | null;
};
export type EvidenceAuditEvent = {
  eventId: string;
  revisionId: string;
  actorUserId: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED" | "REVOKED";
  occurredAt: Date;
  note: string;
};
export type EvidenceRepository = {
  /** Called only by an authenticated server-side operation, never by user-provided JSON. */
  loadRevisions(parkId: string): Promise<readonly EvidenceRevision[]>;
  loadAuditEvents(parkId: string): Promise<readonly EvidenceAuditEvent[]>;
};
export type RegistryLoadResult =
  | { status: "READY"; snapshot: TrustedEvidenceSnapshot; revisionIds: string[] }
  | { status: "UNKNOWN"; snapshot: null; reasons: string[] };

const validTime = (date: Date) => date instanceof Date && Number.isFinite(date.getTime());
const nonempty = (s: string) => typeof s === "string" && s.trim().length > 0;
const approved = (e: EvidenceReview) => e.status === "APPROVED";

/** Fail-closed projection of a SERVER-controlled repository with independent audit events.
 * This verifies record/event consistency, not external-world accuracy or reviewer authorization.
 */
export async function loadReviewedEvidenceSnapshot(input: {
  repository: EvidenceRepository; parkId: string; evaluatedAt: Date; registryVersion: string;
}): Promise<RegistryLoadResult> {
  if (!nonempty(input.parkId) || !nonempty(input.registryVersion) || !validTime(input.evaluatedAt)) {
    return { status: "UNKNOWN", snapshot: null, reasons: ["INVALID_REGISTRY_REQUEST"] };
  }
  let revisions: readonly EvidenceRevision[];
  let events: readonly EvidenceAuditEvent[];
  try {
    [revisions, events] = await Promise.all([
      input.repository.loadRevisions(input.parkId),
      input.repository.loadAuditEvents(input.parkId),
    ]);
  } catch {
    return { status: "UNKNOWN", snapshot: null, reasons: ["REGISTRY_UNAVAILABLE"] };
  }
  if (!Array.isArray(revisions) || !Array.isArray(events)) {
    return { status: "UNKNOWN", snapshot: null, reasons: ["REGISTRY_INVALID_DATA"] };
  }
  const revisionsById = new Map<string, EvidenceRevision>();
  const eventIds = new Set<string>();
  for (const rev of revisions) {
    if (!nonempty(rev.revisionId) || revisionsById.has(rev.revisionId)
      || rev.parkId !== input.parkId || rev.evidence.parkId !== input.parkId
      || !validTime(rev.recordedAt) || rev.recordedAt > input.evaluatedAt
      || (rev.supersedesRevisionId !== null && !nonempty(rev.supersedesRevisionId))) {
      return { status: "UNKNOWN", snapshot: null, reasons: ["REGISTRY_INVALID_REVISION"] };
    }
    revisionsById.set(rev.revisionId, rev);
  }
  for (const event of events) {
    if (!nonempty(event.eventId) || eventIds.has(event.eventId)
      || !revisionsById.has(event.revisionId) || !nonempty(event.actorUserId)
      || !validTime(event.occurredAt) || event.occurredAt > input.evaluatedAt) {
      return { status: "UNKNOWN", snapshot: null, reasons: ["REGISTRY_INVALID_AUDIT"] };
    }
    eventIds.add(event.eventId);
  }
  const superseded = new Set<string>();
  for (const rev of revisions) {
    if (rev.supersedesRevisionId !== null) {
      if (!revisionsById.has(rev.supersedesRevisionId)
        || rev.supersedesRevisionId === rev.revisionId
        || superseded.has(rev.supersedesRevisionId)
        || (revisionsById.get(rev.supersedesRevisionId)?.recordedAt.getTime() ?? Infinity) >= rev.recordedAt.getTime()) {
        return { status: "UNKNOWN", snapshot: null, reasons: ["REGISTRY_INVALID_REVISION_CHAIN"] };
      }
      superseded.add(rev.supersedesRevisionId);
    }
  }
  const active: EvidenceRecord[] = [];
  const activeIds: string[] = [];
  for (const rev of revisions) {
    if (superseded.has(rev.revisionId)) continue;
    const audit = events.filter((e) => e.revisionId === rev.revisionId)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const approval = audit.filter((e) => e.action === "APPROVED");
    const terminal = audit.at(-1);
    const match = approval.length === 1 && terminal?.action === "APPROVED"
      && terminal.actorUserId === rev.evidence.review.reviewedBy
      && terminal.occurredAt.getTime() === rev.evidence.review.reviewedAt.getTime()
      && terminal.occurredAt >= rev.recordedAt && approved(rev.evidence.review);
    if (!match) continue; // unresolved/withdrawn evidence is not silently promoted.
    active.push(rev.evidence);
    activeIds.push(rev.revisionId);
  }
  return { status: "READY", snapshot: {
    origin: "SERVER_REVIEWED_REGISTRY", records: active,
    evaluatedAt: input.evaluatedAt, registryVersion: input.registryVersion,
  }, revisionIds: activeIds };
}
