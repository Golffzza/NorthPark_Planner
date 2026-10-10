import { describe, expect, it } from "vitest";

import { scoreUserProfile } from "@/lib/evaluation/score-user-profile";

describe("scoreUserProfile", () => {
  it.each([
    [1, "CAR", 90],
    [2, "PUBLIC_TRANSPORT", 70],
    [4, "OTHER", 70],
    [5, "MOTORCYCLE", 90],
  ] as const)("scores %i travelers using %s as %i", (travelerCount, transportMode, expected) => {
    expect(scoreUserProfile(travelerCount, transportMode)).toBe(expected);
  });
});
