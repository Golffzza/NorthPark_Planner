import "dotenv/config";

import { chatV2Application } from "@/lib/chat-v2/application/chat-v2-application";
import type { AssistantV2Response } from "@/lib/chat-v2/shared/contracts";

type SmokeCase = {
  input: string;
  expectedTool?: string;
  validate?: (result: AssistantV2Response) => boolean;
};

function firstInput(result: AssistantV2Response): Record<string, unknown> {
  return (result.diagnostics.toolCalls[0]?.input ?? {}) as Record<string, unknown>;
}

function firstOutput(result: AssistantV2Response): Record<string, unknown> {
  return (result.diagnostics.toolCalls[0]?.output ?? {}) as Record<string, unknown>;
}

function includesEveryName(
  result: AssistantV2Response,
  entries: unknown,
): boolean {
  return Array.isArray(entries)
    && entries.every((entry) => {
      if (!entry || typeof entry !== "object" || !("name" in entry)) return false;
      const name = (entry as { name?: unknown }).name;
      return typeof name === "string" && result.message.includes(name);
    });
}

function hasUnrelatedScript(text: string): boolean {
  return /[\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text);
}

function exposesInternalFields(text: string): boolean {
  return /requiresLiveVerification|UNKNOWN_IN_STATIC_RAG|source_ids|chunkId/u.test(text);
}

const cases: SmokeCase[] = [
  { input: "สวัสดี", validate: (result) => result.diagnostics.toolsUsed.length === 0 },
  {
    input: "มีอุทยานทั้งหมดกี่แห่ง",
    expectedTool: "searchParks",
    validate: (result) => {
      const output = result.diagnostics.toolCalls[0]?.output as {
        count?: number;
        coverage?: string;
      } | undefined;
      return (firstInput(result).province === undefined || firstInput(result).province === "")
        && output?.count === 44
        && output.coverage === "NORTHPARK_CATALOG"
        && result.message.includes("NorthPark")
        && !result.message.includes("ทั้งประเทศไทย");
    },
  },
  {
    input: "ตากมีอุทยานอะไรบ้าง",
    expectedTool: "searchParks",
    validate: (result) => firstInput(result).province === "ตาก"
      && includesEveryName(result, firstOutput(result).parks),
  },
  {
    input: "เชียงใหม่มีอุทยานอะไรบ้าง",
    expectedTool: "searchParks",
    validate: (result) => firstInput(result).province === "เชียงใหม่"
      && includesEveryName(result, firstOutput(result).parks),
  },
  {
    input: "ภูเก็ตมีอุทยานอะไรบ้าง",
    expectedTool: "searchParks",
    validate: (result) => {
      const output = result.diagnostics.toolCalls[0]?.output as { count?: number } | undefined;
      return firstInput(result).province === "ภูเก็ต"
        && output?.count === 0
        && result.message.includes("NorthPark")
        && result.message.includes("ไม่มีข้อมูล")
        && !result.message.includes("44 แห่ง");
    },
  },
  {
    input: "ดอยอินทนนท์อยู่จังหวัดอะไร",
    expectedTool: "getParkInfo",
    validate: (result) => firstInput(result).topic === "province",
  },
  {
    input: "ดอยสุเทพอยู่จังหวัดอะไร",
    expectedTool: "getParkInfo",
    validate: (result) => firstInput(result).topic === "province",
  },
  {
    input: "ดอยอินทนนท์มีกิจกรรมอะไรบ้าง",
    expectedTool: "getParkInfo",
    validate: (result) => firstInput(result).topic === "activities",
  },
  {
    input: "ดอยอินทนนท์กางเต็นท์ได้ไหม",
    expectedTool: "getParkInfo",
    validate: (result) => {
      const output = result.diagnostics.toolCalls[0]?.output as { status?: string } | undefined;
      return firstInput(result).topic === "camping"
        && ["EVIDENCE_FOUND", "UNKNOWN"].includes(output?.status ?? "");
    },
  },
  {
    input: "แนะนำอุทยานในจังหวัดตาก",
    expectedTool: "recommendParks",
    validate: (result) => {
      const recommendations = firstOutput(result).recommendations;
      return Array.isArray(recommendations)
        && recommendations.every((recommendation) => {
          const name = recommendation?.park?.name;
          return typeof name === "string" && result.message.includes(name);
        });
    },
  },
  {
    input: "อยากเที่ยวตาก ไปกับพ่อแม่ เดินไม่เยอะ",
    expectedTool: "recommendParks",
    validate: (result) => {
      const input = firstInput(result);
      return input.province === "ตาก"
        && input.fatigue === "LOW"
        && Array.isArray(input.companions)
        && input.companions.includes("FAMILY")
        && input.companions.includes("ELDERLY")
        && input.activities === undefined
        && input.durationDays === undefined
        && Array.isArray(firstOutput(result).recommendations)
        && (firstOutput(result).recommendations as Array<{ park?: { name?: string } }>)
          .every(({ park }) => typeof park?.name === "string"
            && result.message.includes(park.name))
        && !result.message.includes("ประเมินว่าเหมาะกับผู้สูงอายุ");
    },
  },
  {
    input: "เปรียบเทียบดอยอินทนนท์กับดอยสุเทพ",
    expectedTool: "compareParks",
    validate: (result) => {
      const names = firstInput(result).parkNames;
      return Array.isArray(names)
        && names[0] === "ดอยอินทนนท์"
        && names[1] === "ดอยสุเทพ"
        && result.message.includes("อุทยานแห่งชาติดอยอินทนนท์")
        && result.message.includes("อุทยานแห่งชาติดอยสุเทพ-ปุย")
        && result.message.includes("ควรเลือกจุดที่จะไปก่อนสรุป");
    },
  },
  { input: "ดอยอินทนนท์มีอะไรน่าสนใจ", expectedTool: "getParkKnowledge" },
  {
    input: "วันนี้อากาศเป็นยังไง",
    validate: (result) => result.diagnostics.toolsUsed.length === 0
      && /ไม่สามารถ|ไม่มีข้อมูล|ตรวจสอบ.*ไม่ได้/.test(result.message),
  },
];

async function main() {
  let failed = 0;

  for (const smokeCase of cases) {
    console.log("\n==================================================");
    console.log("INPUT");
    console.log(smokeCase.input);

    try {
      const result = await chatV2Application.send({ message: smokeCase.input });
    const routedCorrectly = smokeCase.expectedTool
      ? result.diagnostics.toolsUsed[0] === smokeCase.expectedTool
      : result.diagnostics.toolsUsed.length === 0;
    const passed = routedCorrectly
      && (smokeCase.validate?.(result) ?? true)
      && !hasUnrelatedScript(result.message)
      && !exposesInternalFields(result.message);
    if (!passed) failed += 1;

    console.log("TOOLS USED");
    console.log(JSON.stringify(result.diagnostics.toolsUsed, null, 2));
    console.log("TOOL ARGUMENTS");
    console.log(JSON.stringify(
      result.diagnostics.toolCalls.map(({ toolName, input }) => ({ toolName, input })),
      null,
      2,
    ));
    console.log("RESULT");
    console.log(JSON.stringify(
      result.diagnostics.toolCalls.map(({ toolName, output }) => ({ toolName, output })),
      null,
      2,
    ));
    console.log("FINAL ANSWER");
    console.log(result.message);
    console.log("DURATION");
    console.log(`${result.diagnostics.elapsedMs}ms`);
    console.log("PASS/FAIL");
      console.log(passed ? "PASS" : "FAIL");
    } catch (error) {
      failed += 1;
      console.log("TOOLS USED\n[]");
      console.log("TOOL ARGUMENTS\n[]");
      console.log("RESULT");
      console.log(error);
      console.log("FINAL ANSWER\n<none>");
      console.log("DURATION\n<failed>");
      console.log("PASS/FAIL\nFAIL");
    }
  }

  console.log(`\nSUMMARY: ${cases.length - failed}/${cases.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
