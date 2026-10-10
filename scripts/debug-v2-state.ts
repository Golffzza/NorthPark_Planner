import {
  mergeRecommendationConstraints,
  type RecommendationConstraintPatch,
} from "@/lib/chat-v2/state/recommendation-constraints";

import type { AssistantConstraints } from "@/lib/chat/shared/contracts";

function sameArray(a?: string[], b?: string[]) {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

function runCase(
  name: string,
  before: AssistantConstraints,
  patch: RecommendationConstraintPatch,
  expected: AssistantConstraints,
): AssistantConstraints {
  const after = mergeRecommendationConstraints(before, patch);

  const pass =
    after.province === expected.province &&
    after.fatigue === expected.fatigue &&
    after.durationDays === expected.durationDays &&
    sameArray(after.companions, expected.companions) &&
    sameArray(after.activities, expected.activities) &&
    sameArray(after.excludedActivities, expected.excludedActivities);

  console.log("\n====================================");
  console.log(name);
  console.log("====================================");
  console.log("BEFORE:");
  console.dir(before, { depth: null });

  console.log("\nPATCH:");
  console.dir(patch, { depth: null });

  console.log("\nAFTER:");
  console.dir(after, { depth: null });

  console.log("\nEXPECTED:");
  console.dir(expected, { depth: null });

  console.log(`\n${pass ? "PASS ✅" : "FAIL ❌"}`);

  return after;
}

let state: AssistantConstraints = {
  province: "เชียงใหม่",
  fatigue: "LOW",
  companions: ["FAMILY", "ELDERLY"],
};

state = runCase(
  "CASE 1 — ไม่เอาน้ำตก",
  state,
  {
    excludedActivities: ["WATERFALL"],
  },
  {
    province: "เชียงใหม่",
    fatigue: "LOW",
    companions: ["FAMILY", "ELDERLY"],
    activities: [],
    excludedActivities: ["WATERFALL"],
  },
);

state = runCase(
  "CASE 2 — เปลี่ยนจังหวัดเป็นเชียงราย",
  state,
  {
    province: "เชียงราย",
  },
  {
    province: "เชียงราย",
    fatigue: "LOW",
    companions: ["FAMILY", "ELDERLY"],
    activities: [],
    excludedActivities: ["WATERFALL"],
  },
);

state = runCase(
  "CASE 3 — ไปคนเดียว",
  state,
  {
    companions: [],
  },
  {
    province: "เชียงราย",
    fatigue: "LOW",
    companions: [],
    activities: [],
    excludedActivities: ["WATERFALL"],
  },
);

state = runCase(
  "CASE 4 — เพิ่มกิจกรรมเดินป่า",
  state,
  {
    activities: ["TRAIL"],
  },
  {
    province: "เชียงราย",
    fatigue: "LOW",
    companions: [],
    activities: ["TRAIL"],
    excludedActivities: ["WATERFALL"],
  },
);

state = runCase(
  "CASE 5 — ไม่เอาเดินป่าเพิ่ม",
  state,
  {
    excludedActivities: ["TRAIL"],
  },
  {
    province: "เชียงราย",
    fatigue: "LOW",
    companions: [],
    activities: [],
    excludedActivities: ["WATERFALL", "TRAIL"],
  },
);

console.log("\n====================================");
console.log("FINAL STATE");
console.log("====================================");
console.dir(state, { depth: null });