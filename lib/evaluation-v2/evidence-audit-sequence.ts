import type { EvidenceAuditEvent } from "./evidence-data-contract";

export type AuditSequenceResult =
  | { status: "VALID"; terminal: "NONE" | EvidenceAuditEvent["action"] }
  | { status: "INVALID"; reason: "INVALID_AUDIT_SEQUENCE" };

/** Validate every revision, including superseded and inactive ones. */
export function validateEvidenceAuditSequence(
  recordedAt: Date, audit: readonly EvidenceAuditEvent[],
): AuditSequenceResult {
  if (!(recordedAt instanceof Date) || !Number.isFinite(recordedAt.getTime()))
    return { status: "INVALID", reason: "INVALID_AUDIT_SEQUENCE" };
  const ordered = [...audit].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  let state: "NONE" | EvidenceAuditEvent["action"] = "NONE";
  let previousTime = recordedAt.getTime();
  for (const item of ordered) {
    const at = item.occurredAt.getTime();
    const allowed = (state === "NONE" && ["SUBMITTED", "APPROVED", "REJECTED"].includes(item.action))
      || (state === "SUBMITTED" && ["APPROVED", "REJECTED"].includes(item.action))
      || (state === "APPROVED" && item.action === "REVOKED");
    if (!Number.isFinite(at) || at < previousTime || !allowed)
      return { status: "INVALID", reason: "INVALID_AUDIT_SEQUENCE" };
    state = item.action;
    previousTime = at;
  }
  return { status: "VALID", terminal: state };
}
