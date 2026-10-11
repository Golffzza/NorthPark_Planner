import { describe, expect, it } from "vitest";

import { generateOneSentenceVerdict } from "@/lib/evaluation/one-sentence-verdict";

describe("generateOneSentenceVerdict", () => {
  it("generates verdict with good weather but tight time when time is the main caution", () => {
    const result = generateOneSentenceVerdict({
      totalScore: 78,
      canProceed: true,
      weatherScore: 90,
      durationScore: 80,
      timeScore: 65,
      userProfileScore: 80,
    });

    expect(result.tone).toBe("caution");
    expect(result.verdict).toContain("ทริปนี้สภาพอากาศดีมาก 🌤️");
    expect(result.verdict).toContain("แต่แนะนำให้ออกเดินทางเร็วขึ้น 1 ชม. เพื่อให้ถึงก่อนพระอาทิตย์ตก");
    expect(result.highlightFactor).toBe("time");
  });

  it("generates verdict warning about long duration when duration is weakest", () => {
    const result = generateOneSentenceVerdict({
      totalScore: 72,
      canProceed: true,
      weatherScore: 85,
      durationScore: 55,
      timeScore: 80,
      userProfileScore: 78,
    });

    expect(result.tone).toBe("caution");
    expect(result.verdict).toContain("ทริปนี้สภาพอากาศดีมาก 🌤️");
    expect(result.verdict).toContain("แต่การเดินทางค่อนข้างไกล");
    expect(result.verdict).toContain("แวะจุดพักรถ");
    expect(result.highlightFactor).toBe("duration");
  });

  it("generates verdict warning about rain when weather is weakest", () => {
    const result = generateOneSentenceVerdict({
      totalScore: 68,
      canProceed: true,
      weatherScore: 50,
      durationScore: 80,
      timeScore: 85,
      userProfileScore: 80,
    });

    expect(result.tone).toBe("caution");
    expect(result.verdict).toContain("แต่มีโอกาสพบฝนตก");
    expect(result.highlightFactor).toBe("weather");
  });

  it("generates positive ready-to-go verdict when all factors are high", () => {
    const result = generateOneSentenceVerdict({
      totalScore: 88,
      canProceed: true,
      weatherScore: 92,
      durationScore: 85,
      timeScore: 88,
      userProfileScore: 90,
    });

    expect(result.tone).toBe("positive");
    expect(result.verdict).toContain("พร้อมออกเดินทางตามแผนได้เลย!");
  });

  it("generates warning when blocking constraint exists or canProceed is false", () => {
    const result = generateOneSentenceVerdict({
      totalScore: 40,
      canProceed: false,
      weatherScore: 30,
      durationScore: 40,
      timeScore: 40,
      userProfileScore: 50,
      constraints: [
        {
          severity: "BLOCKING",
          message: "เวลาที่คาดว่าจะถึงเกินเวลาปิดทำการของอุทยาน",
        },
      ],
    });

    expect(result.tone).toBe("warning");
    expect(result.verdict).toContain("⚠️ ติดเงื่อนไขสำคัญ");
    expect(result.verdict).toContain("เวลาที่คาดว่าจะถึงเกินเวลาปิดทำการของอุทยาน");
  });
});
