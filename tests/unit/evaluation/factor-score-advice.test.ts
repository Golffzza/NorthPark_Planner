import { describe, expect, it } from "vitest";
import { getActionableTip } from "@/components/evaluation/factor-score-card";

describe("factor score advice", () => {
  it.each(["weather", "duration", "time", "userProfile"])("does not invent specifics for %s", (key) => {
    for (const score of [30, 65, 90]) {
      const tip = getActionableTip(key, score);
      expect(tip.length).toBeGreaterThan(10);
      expect(tip).not.toMatch(/30–60 นาที|1 ชั่วโมง|2–3 ชั่วโมง|ฟ้าโปร่ง|ถนนคดเคี้ยว|เส้นทางลาดชัน/);
    }
  });
});
