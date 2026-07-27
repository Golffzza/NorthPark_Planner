import { describe, expect, it } from "vitest";

import { scoreWeather } from "@/lib/evaluation/score-weather";

describe("scoreWeather", () => {
  it("lowers the score when weather is worse", () => {
    expect(scoreWeather("CLEAR")).toBeGreaterThan(scoreWeather("LIGHT_RAIN"));
    expect(scoreWeather("LIGHT_RAIN")).toBeGreaterThan(scoreWeather("HEAVY_RAIN"));
    expect(scoreWeather("HEAVY_RAIN")).toBeGreaterThan(scoreWeather("STORM"));
  });
});
