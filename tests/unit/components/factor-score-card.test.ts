import { describe, expect, it } from "vitest";

import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";

describe("FactorScoreViewModel and status mapping", () => {
  it("maps safe status for high score factor", () => {
    const factor: FactorScoreViewModel = {
      key: "weather",
      label: "สภาพอากาศ (Weather)",
      weightLabel: "น้ำหนัก 35%",
      description: "ประเมินจากปริมาณฝน สภาพอากาศเปิด",
      score: 88,
      status: "GOOD",
    };

    expect(factor.score).toBeGreaterThanOrEqual(75);
    expect(factor.status).toBe("GOOD");
  });

  it("maps caution status for moderate score factor", () => {
    const factor: FactorScoreViewModel = {
      key: "time",
      label: "เวลาเดินทางและแสงอาทิตย์ (Time)",
      weightLabel: "น้ำหนัก 20%",
      description: "ประเมินเวลาออกเดินทางเทียบกับเวลาเปิด-ปิดอุทยาน",
      score: 62,
      status: "CAUTION",
    };

    expect(factor.score).toBeLessThan(75);
    expect(factor.score).toBeGreaterThanOrEqual(50);
    expect(factor.status).toBe("CAUTION");
  });

  it("maps risk status for low score factor", () => {
    const factor: FactorScoreViewModel = {
      key: "duration",
      label: "ระยะเวลาเดินทาง (Duration)",
      weightLabel: "น้ำหนัก 25%",
      description: "ประเมินจากระยะทางและเวลาขับขี่",
      score: 42,
      status: "RISK",
    };

    expect(factor.score).toBeLessThan(50);
    expect(factor.status).toBe("RISK");
  });
});
