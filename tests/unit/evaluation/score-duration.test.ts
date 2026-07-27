import { describe, expect, it } from "vitest";

import { scoreDuration } from "@/lib/evaluation/score-duration";

describe("scoreDuration", () => {
  it("lowers the score for long travel durations", () => {
    expect(scoreDuration(90)).toBeGreaterThan(scoreDuration(240));
    expect(scoreDuration(240)).toBeGreaterThan(scoreDuration(480));
  });
});
