import { describe, expect, it } from "vitest";

import { scoreUserProfile } from "@/lib/evaluation/score-user-profile";

describe("scoreUserProfile", () => {
  it.each([
    [1, "CAR", 73],
    [2, "PUBLIC_TRANSPORT", 73],
    [4, "OTHER", 78],
    [5, "MOTORCYCLE", 68],
  ] as const)("scores %i travelers using %s as %i", (travelerCount, transportMode, expected) => {
    expect(scoreUserProfile(travelerCount, transportMode)).toBe(expected);
  });
});
