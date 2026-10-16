import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { EvidenceAuditEvent, EvidenceRevision } from "./evidence-data-contract";
import { authorizeEvidenceReview, type EvidenceReviewStore, type ReviewCommand,
  type ReviewOutcome } from "./evidence-review-workflow";

/** E5.3 candidate, server ONLY. Not wired to an API. Caller must derive the user ID from
 * an authenticated server-side session; caller-controlled actor flags are ignored.
 * Serializable transactions prevent double approvals when concurrent reviewers race.
 */
export function createPrismaEvidenceReviewStore(db: PrismaClient, authenticatedUserId: string): EvidenceReviewStore {
  return {
    async transactionReview({ command }: {
      command: ReviewCommand;
      validate: (revision: EvidenceRevision | null, events: readonly EvidenceAuditEvent[]) => ReviewOutcome;
    }): Promise<ReviewOutcome> {
      if (!authenticatedUserId || command.actor.userId !== authenticatedUserId) {
        return { status: "DENIED", reason: "IDENTITY_MISMATCH" };
      }
      try {
        return await db.$transaction(async tx => {
          const row = await tx.parkEvidenceRevision.findUnique({
            where: { id: command.revisionId },
          });
          if (!row) return { status: "DENIED", reason: "REVISION_NOT_FOUND" };
          const user = await tx.user.findUnique({
            where: { id: authenticatedUserId }, select: { id: true, role: true },
          });
          const authority = await tx.parkEvidenceAuthority.findFirst({
            where: { userId: authenticatedUserId, parkId: row.parkId, canReview: true,
              effectiveFrom: { lte: command.occurredAt }, effectiveTo: { gt: command.occurredAt } },
          });
          const trustedCommand: ReviewCommand = {
            ...command,
            actor: { userId: authenticatedUserId, role: user?.role ?? "USER",
              canReviewParkEvidence: Boolean(authority) },
          };
          if (user?.role !== "ADMIN" || !authority)
            return { status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" };
          const auditRows = await tx.parkEvidenceAuditEvent.findMany({
            where: { revisionId: row.id }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
          });
          const events: EvidenceAuditEvent[] = auditRows.map(e => ({
            eventId: e.id, revisionId: e.revisionId, actorUserId: e.actorUserId,
            action: e.action, occurredAt: e.occurredAt, note: e.note,
          }));
          // The policy requires only the revision identity and creation time;
          // its evidence is not elevated to trusted data during a review action.
          const revision: EvidenceRevision = {
            revisionId: row.id, parkId: row.parkId, recordedAt: row.recordedAt,
            supersedesRevisionId: row.supersedesId,
            evidence: row.payload as unknown as EvidenceRevision["evidence"],
          };
          // Revalidate against authenticated DB state, NOT command.actor.
          const outcome = authorizeEvidenceReview(trustedCommand, revision, events);
          if (outcome.status === "DENIED") return outcome;
          if (row.supersedesId) {
            const ancestor = await tx.parkEvidenceRevision.findUnique({
              where: { id: row.supersedesId }, select: { parkId: true, kind: true, entityKey: true },
            });
            if (!ancestor || ancestor.parkId !== row.parkId || ancestor.kind !== row.kind
              || ancestor.entityKey !== row.entityKey)
              return { status: "DENIED", reason: "INVALID_REVISION_CHAIN" };
          }
          const created = await tx.parkEvidenceAuditEvent.create({
            data: { revisionId: row.id, actorUserId: authenticatedUserId,
              action: command.action, occurredAt: command.occurredAt, note: command.note },
          });
          return { status: "ACCEPTED", event: {
            eventId: created.id, revisionId: created.revisionId,
            actorUserId: created.actorUserId, action: created.action,
            occurredAt: created.occurredAt, note: created.note,
          } };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
          return { status: "DENIED", reason: "CONCURRENT_REVIEW_RETRY_REQUIRED" };
        return { status: "DENIED", reason: "REVIEW_STORE_UNAVAILABLE" };
      }
    },
  };
}
