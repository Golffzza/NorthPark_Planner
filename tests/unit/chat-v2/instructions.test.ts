import { describe, expect, it } from "vitest";

import {
  ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
  ASSISTANT_V2_INSTRUCTIONS,
} from "@/lib/chat-v2/ai/instructions";

describe("Assistant V2 instructions", () => {
  it("requires named-park facts and open knowledge to use their tools", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ใช้ getParkInfo");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ใช้ getParkKnowledge");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามตอบจากความจำของโมเดล");
  });

  it("forbids invented optional tool arguments and unsupported conclusions", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามเติม argument");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("durationDays");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามสรุปว่าอุทยานใดดีกว่า");
  });

  it("contains explicit examples for the routing cases the model previously confused", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain(
      '"ดอยอินทนนท์อยู่จังหวัดอะไร" → getParkInfo',
    );
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain(
      '"แนะนำอุทยานในจังหวัดตาก" → recommendParks {"province":"ตาก"}',
    );
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain(
      '"อยากเที่ยวตาก ไปกับพ่อแม่ เดินไม่เยอะ"',
    );
  });

  it("keeps the final synthesis grounded in the tool result", () => {
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "จากผลเครื่องมือข้างต้น",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ห้ามเพิ่มหรืออนุมาน",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ห้ามแสดงชื่อ field, enum, code",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ใช้เฉพาะข้อเท็จจริง เหตุผล และคำเตือน",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ห้ามเติมคำว่า \"ปัจจุบัน\"",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ต้องบอกว่าเป็นจำนวนในฐานข้อมูล NorthPark",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "รักษาชื่ออุทยานมาตรฐาน",
    );
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain(
      "ห้ามกลับไปสรุปว่าเหมาะกับผู้สูงอายุ",
    );
  });
});
