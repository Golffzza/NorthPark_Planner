// ./scripts/poc-ai-sdk.mjs

import { generateText, tool, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

const model = ollama.chatModel("qwen3:4b-instruct");

const searchParks = tool({
  description:
    "ค้นหารายชื่ออุทยานแห่งชาติใน NorthPark ตามจังหวัด ใช้เมื่อผู้ใช้ถามว่าจังหวัดหนึ่งมีอุทยานอะไรบ้าง",

  inputSchema: z.object({
    province: z.string().describe("ชื่อจังหวัดภาษาไทย"),
  }),

  execute: async ({ province }) => {
    console.log("TOOL CALLED: searchParks");
    console.log("province =", province);

    // mock data สำหรับ POC เท่านั้น
    const mock = {
      ตาก: [
        "อุทยานแห่งชาติตากสินมหาราช",
        "อุทยานแห่งชาติขุนพะวอ",
        "อุทยานแห่งชาติน้ำตกพาเจริญ",
      ],
      เชียงใหม่: ["อุทยานแห่งชาติดอยอินทนนท์", "อุทยานแห่งชาติดอยสุเทพ-ปุย"],
    };

    return {
      province,
      parks: mock[province] ?? [],
    };
  },
});

const getParkInfo = tool({
  description: `
ใช้สำหรับตอบคำถามเกี่ยวกับอุทยานแห่งชาติแห่งใดแห่งหนึ่งโดยเฉพาะ
เช่น จังหวัด ที่ตั้ง กิจกรรม หรือการกางเต็นท์
ห้ามใช้สำหรับค้นหารายชื่ออุทยานทั้งหมดในจังหวัด
`,

  inputSchema: z.object({
    parkName: z.string().describe("ชื่ออุทยานที่ผู้ใช้ถาม"),

    topic: z
      .enum(["province", "activities", "camping", "basic"])
      .describe("หัวข้อข้อมูลที่ผู้ใช้ต้องการ"),
  }),

  execute: async ({ parkName, topic }) => {
    console.log("TOOL CALLED: getParkInfo");
    console.log("parkName =", parkName);
    console.log("topic =", topic);

    // mock data สำหรับ POC เท่านั้น
    const parks = {
      ดอยอินทนนท์: {
        name: "อุทยานแห่งชาติดอยอินทนนท์",
        province: "เชียงใหม่",
        activities: ["ชมวิว", "เดินป่า", "ชมน้ำตก"],
        camping: true,
      },

      ดอยสุเทพ: {
        name: "อุทยานแห่งชาติดอยสุเทพ-ปุย",
        province: "เชียงใหม่",
        activities: ["ชมวิว", "เดินป่า", "เที่ยววัด"],
        camping: false,
      },
    };

    const park = parks[parkName];

    if (!park) {
      return {
        found: false,
        parkName,
      };
    }

    return {
      found: true,
      topic,
      park,
    };
  },
});

const tests = [
  "สวัสดี",

  "ตากมีอุทยานอะไรบ้าง",

  "เชียงใหม่มีอุทยานอะไรบ้าง",

  "ภูเก็ตมีอุทยานอะไรบ้าง",

  "ดอยอินทนนท์อยู่จังหวัดอะไร",

  "ดอยอินทนนท์มีกิจกรรมอะไรบ้าง",

  "ดอยอินทนนท์กางเต็นท์ได้ไหม",

  "ดอยสุเทพอยู่จังหวัดอะไร",

  "ดอยสุเทพกางเต็นท์ได้ไหม",

  "แนะนำอุทยานในจังหวัดตาก",

  "วันนี้อากาศเป็นยังไง",
];

for (const prompt of tests) {
  console.log("\n========================================");
  console.log("USER:", prompt);
  console.log("========================================");

  const startedAt = performance.now();

  try {
    const result = await generateText({
      model,

      system: `
คุณคือ NorthPark ผู้ช่วยท่องเที่ยวอุทยานแห่งชาติ

กฎ:
- ตอบภาษาไทยธรรมชาติ
- ห้ามใช้ตัวอักษรภาษาอื่นปะปนโดยไม่จำเป็น
- ใช้คำว่า "แห่ง" เมื่อนับอุทยาน

- ถ้าผู้ใช้ถามว่าในจังหวัดหนึ่งมีอุทยานอะไรบ้าง
  ให้ใช้ searchParks

- ถ้าผู้ใช้ถามข้อมูลเกี่ยวกับอุทยานแห่งใดแห่งหนึ่ง
  เช่น อยู่จังหวัดอะไร มีกิจกรรมอะไร หรือกางเต็นท์ได้ไหม
  ให้ใช้ getParkInfo

- ห้ามแต่งข้อมูลอุทยานเอง
- ตอบโดยยึดข้อมูลจาก tool
- ถ้า tool ไม่มีข้อมูล ให้บอกว่า NorthPark ไม่มีข้อมูลเพียงพอ

- คำทักทายหรือบทสนทนาทั่วไปไม่ต้องใช้ tool
`,

      prompt,

      tools: {
        searchParks,
        getParkInfo,
      },

      stopWhen: stepCountIs(3),
    });

    console.log("\nFINAL:");
    console.log(result.text);

    console.log("\nTOOL CALLS:");

    const toolCalls = result.steps.flatMap((step) => step.toolCalls);

    if (toolCalls.length === 0) {
      console.log("NONE");
    } else {
      for (const call of toolCalls) {
        console.log(call.toolName, call.input);
      }
    }

    console.log(
      `TIME: ${((performance.now() - startedAt) / 1000).toFixed(2)}s`,
    );
  } catch (error) {
    console.error("ERROR:", error);
  }
}
