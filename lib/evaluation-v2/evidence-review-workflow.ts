import { validateEvidenceAuditSequence } from "./evidence-audit-sequence";
/** E5.2 candidate: server-side review rules. Never expose this directly as a public mutation API. */
import type { EvidenceRecord } from "./trusted-evidence";
import type { EvidenceAuditEvent, EvidenceRevision } from "./evidence-data-contract";

export type ReviewActor = { userId: string; role: "USER" | "ADMIN"; canReviewParkEvidence: boolean };
export type ReviewAction = "APPROVED" | "REJECTED" | "REVOKED";
export type ReviewCommand = { actor: ReviewActor; action: ReviewAction;
  revisionId: string; occurredAt: Date; note: string };
export type ReviewOutcome =
  | { status: "ACCEPTED"; event: EvidenceAuditEvent }
  | { status: "DENIED"; reason: string };

/** Pure policy check; the repository must enforce this again in a DB transaction. */
export function authorizeEvidenceReview(command: ReviewCommand, revision: EvidenceRevision | null,
  existingEvents: readonly EvidenceAuditEvent[]): ReviewOutcome {
  if (command.actor.role !== "ADMIN" || !command.actor.canReviewParkEvidence
    || !command.actor.userId.trim()) return { status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" };
  if (!revision || revision.revisionId !== command.revisionId)
    return { status: "DENIED", reason: "REVISION_NOT_FOUND" };
  if (!(command.occurredAt instanceof Date) || !Number.isFinite(command.occurredAt.getTime())
    || command.occurredAt < revision.recordedAt)
    return { status: "DENIED", reason: "INVALID_REVIEW_TIME" };
  if (!command.note.trim()) return { status: "DENIED", reason: "REVIEW_REASON_REQUIRED" };
  const ordered = [...existingEvents].sort((a,b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  if (ordered.some(e => e.revisionId !== revision.revisionId))
    return { status: "DENIED", reason: "INVALID_AUDIT_SCOPE" };
  if (ordered.some(e => e.occurredAt > command.occurredAt))
    return { status: "DENIED", reason: "STALE_REVIEW_ACTION" };
  const sequence = validateEvidenceAuditSequence(revision.recordedAt, ordered);
  if (sequence.status === "INVALID") return { status: "DENIED", reason: "INVALID_AUDIT_SEQUENCE" };
  const previous = sequence.terminal === "NONE" ? undefined : sequence.terminal;
  if (previous === "REVOKED" || previous === "REJECTED")
    return { status: "DENIED", reason: "TERMINAL_REVISION" };
  if (command.action === "REVOKED" && previous !== "APPROVED")
    return { status: "DENIED", reason: "NOT_APPROVED" };
  if (command.action !== "REVOKED" && previous === "APPROVED")
    return { status: "DENIED", reason: "ALREADY_APPROVED" };
  return { status: "ACCEPTED", event: {
    eventId: "", // DB generates immutable ID on atomic append
    revisionId: revision.revisionId, actorUserId: command.actor.userId,
    action: command.action, occurredAt: command.occurredAt, note: command.note,
  } };
}

/** Persistence is purposefully abstract; caller cannot select the actor without authentication. */
export interface EvidenceReviewStore {
  transactionReview(input: {
    command: ReviewCommand;
    validate: (revision: EvidenceRevision | null, events: readonly EvidenceAuditEvent[]) => ReviewOutcome;
  }): Promise<ReviewOutcome>;
}

export async function submitEvidenceReview(input: {
  store: EvidenceReviewStore; actor: ReviewActor; action: ReviewAction;
  revisionId: string; note: string; occurredAt: Date;
}): Promise<ReviewOutcome> {
  const { store, ...command } = input;
  // An actual adapter must lock the revision, re-check reviewer permissions via DB,
  // invoke validate and atomically append the audit event with a generated ID.
  return store.transactionReview({ command,
    validate: (revision, events) => authorizeEvidenceReview(command, revision, events) });
}

export type EvidenceProposal = { parkId: string; record: EvidenceRecord;
  submittedBy: string; submittedAt: Date };
