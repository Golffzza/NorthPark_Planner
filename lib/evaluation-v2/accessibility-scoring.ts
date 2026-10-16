/** Accessibility is destination-side evidence only; routing success does not pass any check. */
export const ACCESS_RUBRIC_VERSION = "E1.1-ACCESS-CANDIDATE";
export type AccessCheckId = "A1_ENTRANCE" | "A2_TRANSPORT_PERMISSION" | "A3_LAST_MILE";
export type AccessCheckOutcome = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";
export type AccessCheck = { id: AccessCheckId; outcome: AccessCheckOutcome;
  evidenceId: string | null; reason: string | null };
export type AccessResult = { status: "KNOWN" | "UNKNOWN"; A: number | null;
  checks: AccessCheck[]; accessEvidenceStatus: "REFERENCE_RECORDED" | "REFERENCE_NEEDS_REVIEW" | "DESTINATION_ACCESS_UNVERIFIED";
  rubricVersion: typeof ACCESS_RUBRIC_VERSION; missingReasons: string[] };
export type AccessClaim = { parkId: string; entranceId?: string; sourceId?: string;
  reviewStatus?: "VERIFIED" | "PENDING" | "REJECTED"; transportMode: string;
  lastMileRequired?: boolean };

/** Deterministic fixture arithmetic only. Evidence decisions must be made before calling this. */
export function calculateAccessibilityFromReviewedFixture(checks: readonly AccessCheck[]): AccessResult {
  const expected: AccessCheckId[] = ["A1_ENTRANCE", "A2_TRANSPORT_PERMISSION", "A3_LAST_MILE"];
  const valid = checks.length === 3 && expected.every((id) => checks.filter((c) => c.id === id).length === 1);
  const missingReasons: string[] = [];
  if (!valid) missingReasons.push("INVALID_CHECK_SET");
  for (const check of checks) {
    if (check.outcome === "UNKNOWN") missingReasons.push(`${check.id}_UNKNOWN`);
    if (!check.evidenceId?.trim()) missingReasons.push(`${check.id}_EVIDENCE_MISSING`);
    if (check.outcome === "NOT_APPLICABLE" && !check.reason?.trim()) missingReasons.push(`${check.id}_APPLICABILITY_UNVERIFIED`);
  }
  const applicable = checks.filter((c) => c.outcome !== "NOT_APPLICABLE");
  if (!applicable.length) missingReasons.push("NO_APPLICABLE_CHECKS");
  const A = missingReasons.length ? null : 100 * applicable.filter((c) => c.outcome === "PASS").length / applicable.length;
  return { status: A === null ? "UNKNOWN" : "KNOWN", A, checks: [...checks],
    accessEvidenceStatus: "DESTINATION_ACCESS_UNVERIFIED", rubricVersion: ACCESS_RUBRIC_VERSION,
    missingReasons: [...new Set(missingReasons)] };
}

/** Caller-provided source IDs, fee metadata and VERIFIED labels do not establish actual access. */
export function scoreAccessibilityV2(claim: AccessClaim): AccessResult {
  const recorded = Boolean(claim.parkId?.trim() && claim.entranceId?.trim());
  const checks: AccessCheck[] = [
    { id: "A1_ENTRANCE", outcome: "UNKNOWN", evidenceId: null, reason: "NO_TRUSTED_ENTRANCE_REGISTRY" },
    { id: "A2_TRANSPORT_PERMISSION", outcome: "UNKNOWN", evidenceId: null, reason: "NO_TRUSTED_PERMISSION_EVIDENCE" },
    { id: "A3_LAST_MILE", outcome: "UNKNOWN", evidenceId: null, reason: "LAST_MILE_APPLICABILITY_UNVERIFIED" },
  ];
  return { status: "UNKNOWN", A: null, checks,
    accessEvidenceStatus: recorded ? "REFERENCE_NEEDS_REVIEW" : "DESTINATION_ACCESS_UNVERIFIED",
    rubricVersion: ACCESS_RUBRIC_VERSION,
    missingReasons: checks.map((check) => check.reason as string) };
}
