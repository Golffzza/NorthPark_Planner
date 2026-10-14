import { describe, expect, it } from "vitest";
import { resolveTripCanProceed } from "@/lib/evaluation/resolve-trip-can-proceed";

describe("resolveTripCanProceed", () => {
  it("does not treat a blocking constraint as proceedable when field is missing", () => {
    expect(resolveTripCanProceed(null, [{ severity: "BLOCKING" }])).toBe(false);
    expect(resolveTripCanProceed(true, [{ severity: "BLOCKING" }])).toBe(false);
  });
  it("keeps warnings advisory", () => {
    expect(resolveTripCanProceed(null, [{ severity: "WARNING" }])).toBe(true);
    expect(resolveTripCanProceed(true, [{ severity: "WARNING" }])).toBe(true);
  });
  it("respects explicit false and legacy no-constraint fallback", () => {
    expect(resolveTripCanProceed(false, [])).toBe(false);
    expect(resolveTripCanProceed(undefined, [])).toBe(true);
  });
});
