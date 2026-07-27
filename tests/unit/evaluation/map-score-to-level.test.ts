import { describe, expect, it } from "vitest";

import { mapScoreToLevel } from "@/lib/evaluation/map-score-to-level";

describe("mapScoreToLevel", () => {
  it("maps score ranges to the correct level", () => {
    expect(mapScoreToLevel(85)).toBe("EXCELLENT");
    expect(mapScoreToLevel(70)).toBe("GOOD");
    expect(mapScoreToLevel(50)).toBe("MODERATE");
    expect(mapScoreToLevel(25)).toBe("NEEDS_ADJUSTMENT");
  });
});
