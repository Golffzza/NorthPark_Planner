import { describe, expect, it } from "vitest";
import {
  ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
  ASSISTANT_V2_INSTRUCTIONS,
} from "@/lib/chat-v2/ai/instructions";

describe("Assistant V2 instructions", () => {
  it("routes park facts and open knowledge through evidence tools", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("getParkInfo:");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("getParkKnowledge:");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ต้องค้นข้อมูลจากเครื่องมือก่อน");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามใช้ความจำของโมเดลมาแต่งข้อมูลอุทยาน");
  });

  it("preserves user choice and permits ordinary tourism questions", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามเลือกแทนผู้ใช้");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("อย่าบังคับให้ผู้ใช้เข้าสู่กระบวนการวางแผนเที่ยว");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("เมื่อผู้ใช้เปลี่ยนจังหวัด");
  });

  it("keeps final answers grounded and avoids repeated greetings", () => {
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain("ใช้เฉพาะข้อเท็จจริง");
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain("ห้ามแต่งข้อมูลอุทยาน");
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain("ไม่ทักทายซ้ำ");
    expect(ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS).toContain("ไม่จำเป็นต้องถามคำถามปิดท้ายทุกครั้ง");
  });

  it("only allows OSRM driving estimates when nearby routing succeeded", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("roadDistanceMeters and estimatedDrivingMinutes are OSRM estimates only when routeStatus is OK");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("For NO_ROUTE, UNSUPPORTED, UNAVAILABLE, or missing values, do not state a driving distance or travel time");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("PLACE_REFERENCE_REQUIRED means no route can be attributed to a place");
  });

  it("uses saved trip evaluations without inventing or recalculating scores", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("getTripEvaluation:");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("ห้ามสร้างหรือคำนวณคะแนนเอง");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("อย่าเลือกจาก Selected Park เพียงอย่างเดียว");
  });

  it("keeps daily forecasts distinct from current observations and park status", () => {
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("getParkWeather:");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("พยากรณ์รายวัน ไม่ใช่สภาพอากาศที่ตรวจวัดขณะนี้");
    expect(ASSISTANT_V2_INSTRUCTIONS).toContain("พยากรณ์อากาศใช้ยืนยันว่าอุทยานเปิดอยู่หรือเส้นทางปลอดภัยไม่ได้");
  });
});
