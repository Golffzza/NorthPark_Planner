//* ./scripts/test-trip-evaluation.ts

import assert from "node:assert/strict";

import { calculateTripEvaluation } from "../lib/evaluation/calculate-trip-evaluation";
import { scoreDuration } from "../lib/evaluation/score-duration";
import { scoreTimeSuitability } from "../lib/evaluation/score-time-suitability";

import type {
  TripEvaluationInput,
  TripEvaluationResult,
} from "../lib/evaluation/types";

type TestCase = {
  name: string;
  input: TripEvaluationInput;
  verify: (result: TripEvaluationResult) => void;
};

const BASE_INPUT: TripEvaluationInput = {
  weatherCondition: "CLEAR",
  estimatedTravelMinutes: 60,
  departAt: "08:00",
  mockSunsetTime: "18:30",
  parkOpenTime: "08:00",
  parkCloseTime: "18:00",
  travelerCount: 1,
  transportMode: "CAR",
  hasDirectPublicTransit: undefined,
  parkName: "อุทยานทดสอบ",
};

function createInput(
  overrides: Partial<TripEvaluationInput> = {},
): TripEvaluationInput {
  return {
    ...BASE_INPUT,
    ...overrides,
  };
}

function runTest(
  name: string,
  test: () => void,
): boolean {
  try {
    test();

    console.log(`✅ PASS: ${name}`);

    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);

    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }

    return false;
  }
}

function printEvaluation(
  name: string,
  result: TripEvaluationResult,
): void {
  console.log(`\n--- ${name} ---`);

  console.table({
    total: result.totalScore,
    level: result.level,
    canProceed: result.canProceed,

    weather: result.weatherScore,
    duration: result.durationScore,
    time: result.timeScore,
    accessibility: result.userProfileScore,
  });

  console.log("Summary:");
  console.log(result.summary);

  console.log("\nRecommendation:");
  console.log(result.recommendation);

  if (result.constraints.length > 0) {
    console.log("\nConstraints:");
    console.table(result.constraints);
  }
}

/**
 * -----------------------------------------------------
 * Unit tests
 * -----------------------------------------------------
 */

const unitTests: Array<{
  name: string;
  test: () => void;
}> = [
  {
    name: "Duration: 180 นาทีควรได้ 80 คะแนน",
    test: () => {
      assert.equal(scoreDuration(180), 80);
    },
  },

  {
    name: "Duration: 181 นาทีไม่ควรตกจาก 80 → 60",
    test: () => {
      const at180 = scoreDuration(180);
      const at181 = scoreDuration(181);

      assert.ok(
        Math.abs(at180 - at181) <= 1,
        `180 นาที=${at180}, 181 นาที=${at181}`,
      );
    },
  },

  {
    name: "Duration: คะแนนควรค่อย ๆ ลดตามเวลา",
    test: () => {
      const scores = [
        scoreDuration(90),
        scoreDuration(180),
        scoreDuration(240),
        scoreDuration(300),
        scoreDuration(420),
        scoreDuration(600),
      ];

      for (let i = 1; i < scores.length; i += 1) {
        assert.ok(
          scores[i] <= scores[i - 1],
          `คะแนนไม่ควรเพิ่มขึ้นเมื่อเดินทางนานขึ้น: ${scores.join(", ")}`,
        );
      }
    },
  },

  {
    name: "Time: ออกก่อนอุทยานเปิด แต่ถึงหลังเปิด ไม่ควรถูกหัก",
    test: () => {
      const score = scoreTimeSuitability({
        departAt: "06:00",
        estimatedTravelMinutes: 180,
        parkOpenTime: "08:00",
        parkCloseTime: "18:00",
        mockSunsetTime: "18:30",
      });

      // ถึง 09:00 หลังเปิดแล้ว
      assert.equal(score, 90);
    },
  },

  {
    name: "Time: ถึงหลังเวลาปิดควรได้ 0",
    test: () => {
      const score = scoreTimeSuitability({
        departAt: "17:00",
        estimatedTravelMinutes: 120,
        parkOpenTime: "08:00",
        parkCloseTime: "18:00",
        mockSunsetTime: "18:30",
      });

      assert.equal(score, 0);
    },
  },

  {
    name: "Time: ถึงใกล้พระอาทิตย์ตกควรถูกลดคะแนน",
    test: () => {
      const score = scoreTimeSuitability({
        departAt: "15:00",
        estimatedTravelMinutes: 60,
        parkOpenTime: "08:00",
        parkCloseTime: "18:00",
        mockSunsetTime: "16:30",
      });

      // ETA = 16:00 เหลือก่อน sunset 30 นาที
      assert.equal(score, 65);
    },
  },
];

/**
 * -----------------------------------------------------
 * Integration / scenario tests
 * -----------------------------------------------------
 */

const scenarioTests: TestCase[] = [
  {
    name: "01 — อากาศดี + เดินทางสั้น + รถยนต์",
    input: createInput(),

    verify: (result) => {
      assert.equal(result.weatherScore, 95);
      assert.equal(result.durationScore, 95);
      assert.equal(result.timeScore, 90);
      assert.equal(result.userProfileScore, 90);

      assert.equal(result.totalScore, 93);

      assert.equal(result.level, "EXCELLENT");
      assert.equal(result.canProceed, true);

      assert.equal(result.constraints.length, 0);
    },
  },

  {
    name: "02 — จำนวนผู้เดินทางไม่ควรกระทบคะแนน",
    input: createInput({
      travelerCount: 1,
    }),

    verify: (soloResult) => {
      const groupResult = calculateTripEvaluation(
        createInput({
          travelerCount: 4,
        }),
      );

      assert.equal(
        soloResult.userProfileScore,
        groupResult.userProfileScore,
      );

      assert.equal(
        soloResult.totalScore,
        groupResult.totalScore,
      );

      assert.ok(
        soloResult.recommendation.includes(
          "เดินทางคนเดียว",
        ),
        "เดินทางคนเดียวควรมี recommendation",
      );
    },
  },

  {
    name: "03 — ออกเช้าแต่ถึงหลังอุทยานเปิด",
    input: createInput({
      departAt: "06:00",
      estimatedTravelMinutes: 180,
    }),

    verify: (result) => {
      // 06:00 + 3 ชั่วโมง = 09:00
      assert.equal(result.timeScore, 90);

      assert.equal(result.canProceed, true);
    },
  },

  {
    name: "04 — ถึงหลังเวลาปิดต้องถูก BLOCK",
    input: createInput({
      departAt: "17:00",
      estimatedTravelMinutes: 120,
    }),

    verify: (result) => {
      assert.equal(result.timeScore, 0);

      assert.equal(result.canProceed, false);

      assert.equal(
        result.level,
        "NEEDS_ADJUSTMENT",
      );

      assert.ok(
        result.constraints.some(
          (constraint) =>
            constraint.code ===
            "ARRIVAL_AFTER_PARK_CLOSE",
        ),
        "ควรมี ARRIVAL_AFTER_PARK_CLOSE constraint",
      );

      /**
       * จุดนี้สำคัญ:
       *
       * แม้ weighted score อาจยังมากกว่า 60
       * แต่ level ต้องถูก override เพราะเข้าอุทยานไม่ได้
       */
      assert.ok(
        result.totalScore > 0,
        "คะแนนทางคณิตศาสตร์ยังสามารถมีค่าได้",
      );
    },
  },

  {
    name: "05 — Public transport มีรถตรง",
    input: createInput({
      transportMode: "PUBLIC_TRANSPORT",
      hasDirectPublicTransit: true,
    }),

    verify: (result) => {
      assert.equal(result.userProfileScore, 90);

      assert.ok(
        result.factors.userProfile.reason.includes(
          "เข้าถึงจุดหมาย",
        ),
      );
    },
  },

  {
    name: "06 — Public transport ไม่มีรถตรง",
    input: createInput({
      transportMode: "PUBLIC_TRANSPORT",
      hasDirectPublicTransit: false,
    }),

    verify: (result) => {
      assert.equal(result.userProfileScore, 55);

      assert.ok(
        result.factors.userProfile.reason.includes(
          "ต่อรถ",
        ),
      );

      assert.ok(
        result.recommendation.includes("ต่อรถ"),
      );
    },
  },

  {
    name: "07 — Motorcycle ไม่ควรถูกหักคะแนนเพียงเพราะเป็น Motorcycle",
    input: createInput({
      transportMode: "MOTORCYCLE",
    }),

    verify: (result) => {
      assert.equal(result.userProfileScore, 90);
    },
  },

  {
    name: "08 — ฝนหนักไม่ควรถูกหักซ้ำใน Transport Score",
    input: createInput({
      weatherCondition: "HEAVY_RAIN",
      transportMode: "MOTORCYCLE",
    }),

    verify: (motorcycleResult) => {
      const carResult = calculateTripEvaluation(
        createInput({
          weatherCondition: "HEAVY_RAIN",
          transportMode: "CAR",
        }),
      );

      assert.equal(
        motorcycleResult.weatherScore,
        35,
      );

      /**
       * CAR และ MOTORCYCLE ได้ accessibility เท่ากัน
       * เพราะฝนถูกคิดใน Weather Score อยู่แล้ว
       */
      assert.equal(
        motorcycleResult.userProfileScore,
        carResult.userProfileScore,
      );

      assert.equal(
        motorcycleResult.userProfileScore,
        90,
      );
    },
  },

  {
    name: "09 — Storm ควรทำให้ Weather เป็น weakest factor",
    input: createInput({
      weatherCondition: "STORM",
    }),

    verify: (result) => {
      assert.equal(result.weatherScore, 10);

      assert.equal(
        result.weakestFactor,
        "weather",
      );

      assert.ok(
        result.recommendation.includes(
          "สภาพอากาศ",
        ),
      );
    },
  },

  {
    name: "10 — เดินทาง 3 ชั่วโมง 1 นาที ไม่ควรร่วงเหลือ 60",
    input: createInput({
      estimatedTravelMinutes: 181,
    }),

    verify: (result) => {
      assert.ok(
        result.durationScore >= 79,
        `ได้ ${result.durationScore} คะแนน`,
      );
    },
  },

  {
    name: "11 — เดินทาง 4 ชั่วโมงควรได้ประมาณ 70",
    input: createInput({
      estimatedTravelMinutes: 240,
    }),

    verify: (result) => {
      assert.equal(result.durationScore, 70);
    },
  },

  {
    name: "12 — ถึงก่อนเปิดมากกว่า 1 ชั่วโมง",
    input: createInput({
      departAt: "05:00",
      estimatedTravelMinutes: 60,
      parkOpenTime: "08:00",
    }),

    verify: (result) => {
      // ETA = 06:00 / เปิด 08:00
      assert.equal(result.timeScore, 65);

      /**
       * ถึงก่อนเปิดไม่ได้หมายความว่าเข้าไม่ได้ตลอดทริป
       * จึงไม่ใช่ hard constraint
       */
      assert.equal(result.canProceed, true);
    },
  },

  {
    name: "13 — Result ต้องมีเหตุผลครบทุก factor",
    input: createInput({
      weatherCondition: "LIGHT_RAIN",
      estimatedTravelMinutes: 240,
    }),

    verify: (result) => {
      assert.ok(result.factors.weather.reason);
      assert.ok(result.factors.duration.reason);
      assert.ok(result.factors.time.reason);
      assert.ok(result.factors.userProfile.reason);

      assert.ok(
        result.factors.weather.reason.length > 0,
      );

      assert.ok(
        result.factors.duration.reason.length > 0,
      );
    },
  },

  {
    name: "14 — evaluatedAt ต้องถูกสร้าง",
    input: createInput(),

    verify: (result) => {
      assert.ok(result.evaluatedAt);

      const timestamp = Date.parse(
        result.evaluatedAt,
      );

      assert.ok(
        Number.isFinite(timestamp),
        "evaluatedAt ต้องเป็น ISO date ที่อ่านได้",
      );
    },
  },

  {
    name: "15 — Score ทุก factor ต้องอยู่ระหว่าง 0–100",
    input: createInput({
      weatherCondition: "LIGHT_RAIN",
      estimatedTravelMinutes: 500,
      departAt: "06:00",
      transportMode: "PUBLIC_TRANSPORT",
      hasDirectPublicTransit: false,
    }),

    verify: (result) => {
      const scores = [
        result.totalScore,
        result.weatherScore,
        result.durationScore,
        result.timeScore,
        result.userProfileScore,
      ];

      for (const score of scores) {
        assert.ok(
          score >= 0 && score <= 100,
          `พบคะแนนผิดช่วง: ${score}`,
        );
      }
    },
  },
];

/**
 * -----------------------------------------------------
 * Run
 * -----------------------------------------------------
 */

console.log("\n====================================");
console.log(" NorthPark Trip Evaluation Test");
console.log("====================================\n");

let passed = 0;
let failed = 0;

console.log("UNIT TESTS\n");

for (const unitTest of unitTests) {
  const success = runTest(
    unitTest.name,
    unitTest.test,
  );

  if (success) {
    passed += 1;
  } else {
    failed += 1;
  }
}

console.log("\nSCENARIO TESTS\n");

for (const scenario of scenarioTests) {
  const success = runTest(
    scenario.name,
    () => {
      const result =
        calculateTripEvaluation(
          scenario.input,
        );

      scenario.verify(result);
    },
  );

  if (success) {
    passed += 1;
  } else {
    failed += 1;
  }
}

/**
 * แสดงตัวอย่าง output จริงท้าย test
 */
const previewInput = createInput({
  weatherCondition: "LIGHT_RAIN",
  estimatedTravelMinutes: 294,
  departAt: "09:00",
  transportMode: "CAR",
  travelerCount: 1,
  parkOpenTime: "08:00",
  parkCloseTime: "18:00",
  mockSunsetTime: "18:30",
});

const previewResult =
  calculateTripEvaluation(previewInput);

printEvaluation(
  "ตัวอย่าง Trip จริง",
  previewResult,
);

console.log("\n====================================");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log("====================================\n");

if (failed > 0) {
  console.error(
    "❌ Evaluation test failed",
  );

  process.exit(1);
}

console.log(
  "✅ Evaluation logic ผ่าน test ทั้งหมด",
);