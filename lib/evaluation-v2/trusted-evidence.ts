/** E5 candidate: registry records are server-curated inputs, NEVER client-submitted claims.
 * This module validates provenance and consistency; it does not independently certify a source.
 * Production must supply records through an authorized, audited server-side repository.
 */
import type { VisitSchedule } from "./timeline";

export type EvidenceReview = {
  evidenceId: string;
  sourceId: string;
  sourceUrl: string;
  reviewedBy: string;
  reviewedAt: Date;
  effectiveFrom: Date;
  effectiveTo: Date;
  status: "APPROVED" | "PENDING" | "REJECTED" | "REVOKED";
};

export type EntranceRecord = {
  kind: "ENTRANCE"; parkId: string; entranceId: string;
  latitude: number; longitude: number; review: EvidenceReview;
};
export type ScheduleRecord = {
  kind: "SCHEDULE"; parkId: string; serviceDate: string; timeZone: string;
  intervals: VisitSchedule["intervals"]; review: EvidenceReview;
};
export type PermissionRecord = {
  kind: "PERMISSION"; parkId: string; entranceId: string; transportMode: string;
  permitted: boolean; review: EvidenceReview;
};
export type LastMileRecord = {
  kind: "LAST_MILE"; parkId: string; entranceId: string; transportMode: string;
  applicability: "REQUIRED" | "NOT_REQUIRED";
  accessible: boolean | null; rationale: string; review: EvidenceReview;
};
export type EvidenceRecord = EntranceRecord | ScheduleRecord | PermissionRecord | LastMileRecord;
export type EvidenceDecision<T extends EvidenceRecord> = {
  status: "VERIFIED" | "UNKNOWN"; record: T | null; evidenceId: string | null;
  missingReasons: string[];
};
export type TrustedEvidenceSnapshot = { records: readonly EvidenceRecord[]; evaluatedAt: Date;
  origin: "SERVER_REVIEWED_REGISTRY"; registryVersion: string };

const validDate = (date: Date): boolean => date instanceof Date && Number.isFinite(date.getTime());
const nonempty = (value: string): boolean => typeof value === "string" && value.trim().length > 0;
function validReview(review: EvidenceReview, at: Date): boolean {
  return nonempty(review.evidenceId) && nonempty(review.sourceId)
    && nonempty(review.reviewedBy) && validDate(review.reviewedAt)
    && validDate(review.effectiveFrom) && validDate(review.effectiveTo)
    && review.effectiveFrom <= at && at < review.effectiveTo
    && review.reviewedAt <= at && review.reviewedAt <= review.effectiveTo
    && review.status === "APPROVED"
    && /^https:\/\//i.test(review.sourceUrl) && (() => {
      try { const url = new URL(review.sourceUrl); return Boolean(url.hostname && url.username === "" && url.password === ""); }
      catch { return false; }
    })();
}
function validRecord(record: EvidenceRecord): boolean {
  if (!nonempty(record.parkId)) return false;
  switch (record.kind) {
    case "ENTRANCE": return nonempty(record.entranceId)
      && Number.isFinite(record.latitude) && Math.abs(record.latitude) <= 90
      && Number.isFinite(record.longitude) && Math.abs(record.longitude) <= 180;
    case "SCHEDULE": return /^\d{4}-\d{2}-\d{2}$/.test(record.serviceDate)
      && !Number.isNaN(Date.parse(record.serviceDate + "T00:00:00Z"))
      && nonempty(record.timeZone) && Array.isArray(record.intervals);
    case "PERMISSION": return nonempty(record.entranceId) && nonempty(record.transportMode)
      && typeof record.permitted === "boolean";
    case "LAST_MILE": return nonempty(record.entranceId) && nonempty(record.transportMode)
      && nonempty(record.rationale)
      && (record.applicability === "NOT_REQUIRED" ? record.accessible === null
        : typeof record.accessible === "boolean");
  }
}

/** Fail closed if no record, conflicting approved records, stale review, or malformed evidence. */
export function resolveEvidence<T extends EvidenceRecord>(input: {
  snapshot: TrustedEvidenceSnapshot; kind: T["kind"]; parkId: string;
  matches: (record: T) => boolean;
}): EvidenceDecision<T> {
  const { snapshot } = input;
  if (snapshot.origin !== "SERVER_REVIEWED_REGISTRY" || !nonempty(snapshot.registryVersion)
    || !validDate(snapshot.evaluatedAt)) {
    return { status: "UNKNOWN", record: null, evidenceId: null, missingReasons: ["REGISTRY_UNTRUSTED"] };
  }
  const records = snapshot.records.filter((candidate): candidate is T =>
    candidate.kind === input.kind && candidate.parkId === input.parkId)
    .filter(input.matches);
  if (records.length === 0) return { status: "UNKNOWN", record: null,
    evidenceId: null, missingReasons: ["EVIDENCE_NOT_FOUND"] };
  // Suspended, revoked and expired records cannot be superseded silently without
  // a versioned lifecycle decision in the registry; duplicates are ambiguous.
  if (records.length !== 1) return { status: "UNKNOWN", record: null,
    evidenceId: null, missingReasons: ["EVIDENCE_CONFLICT"] };
  const record = records[0];
  if (!validRecord(record) || !validReview(record.review, snapshot.evaluatedAt)) {
    return { status: "UNKNOWN", record: null,
      evidenceId: null, missingReasons: ["EVIDENCE_NOT_CURRENT_OR_REVIEWED"] };
  }
  return { status: "VERIFIED", record, evidenceId: record.review.evidenceId, missingReasons: [] };
}

export function resolveEntrance(snapshot: TrustedEvidenceSnapshot, parkId: string, entranceId: string) {
  return resolveEvidence<EntranceRecord>({ snapshot, kind: "ENTRANCE", parkId,
    matches: record => record.entranceId === entranceId });
}
export function resolveSchedule(snapshot: TrustedEvidenceSnapshot, parkId: string, serviceDate: string) {
  return resolveEvidence<ScheduleRecord>({ snapshot, kind: "SCHEDULE", parkId,
    matches: record => record.serviceDate === serviceDate });
}
export function resolvePermission(snapshot: TrustedEvidenceSnapshot, parkId: string,
  entranceId: string, transportMode: string) {
  return resolveEvidence<PermissionRecord>({ snapshot, kind: "PERMISSION", parkId,
    matches: record => record.entranceId === entranceId && record.transportMode === transportMode });
}
export function resolveLastMile(snapshot: TrustedEvidenceSnapshot, parkId: string,
  entranceId: string, transportMode: string) {
  return resolveEvidence<LastMileRecord>({ snapshot, kind: "LAST_MILE", parkId,
    matches: record => record.entranceId === entranceId && record.transportMode === transportMode });
}
