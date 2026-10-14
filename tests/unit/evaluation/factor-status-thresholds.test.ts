import { describe, expect, it } from "vitest";

import { getFactorStatus } from "@/lib/evaluation/constants";

describe("shared factor status thresholds", () => {
  it.each([
    [0, "RISK"],
    [50, "RISK"],
    [59, "RISK"],
    [60, "CAUTION"],
    [75, "CAUTION"],
    [79, "CAUTION"],
    [80, "GOOD"],
    [100, "GOOD"],
  ] as const)("maps score %i to %s", (score, expected) => {
    expect(getFactorStatus(score)).toBe(expected);
  });
});
