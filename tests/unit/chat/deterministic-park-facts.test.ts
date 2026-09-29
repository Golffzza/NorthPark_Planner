import { describe, expect, it, vi } from "vitest";

import { answerDeterministicParkFact } from "@/lib/chat/rag/deterministic-park-facts";
import { RagChatResponder } from "@/lib/chat/rag/rag-chat-responder";

describe("answerDeterministicParkFact", () => {
  it("answers the province for Si Satchanalai from the canonical index", () => {
    expect(
      answerDeterministicParkFact(
        "อุทยานแห่งชาติศรีสัชนาลัย อยู่จังหวัดอะไร",
      ),
    ).toBe("อุทยานแห่งชาติศรีสัชนาลัยอยู่ในจังหวัดสุโขทัยครับ");
  });

  it("answers every province for a park that spans multiple provinces", () => {
    expect(
      answerDeterministicParkFact("อุทยานแห่งชาติดอยหลวงอยู่จังหวัดไหน"),
    ).toBe(
      "อุทยานแห่งชาติดอยหลวงครอบคลุมพื้นที่จังหวัดเชียงราย พะเยา และลำปางครับ",
    );
  });

  it("does not intercept recommendation questions", () => {
    expect(
      answerDeterministicParkFact("มีอุทยานอะไรน่าเที่ยวในเชียงใหม่"),
    ).toBeUndefined();
  });
});

describe("RagChatResponder deterministic facts", () => {
  it("returns a canonical province without calling the LLM", async () => {
    const chat = vi.fn();
    const responder = new RagChatResponder({ chat });

    await expect(
      responder.respond(
        [],
        "อุทยานแห่งชาติศรีสัชนาลัย อยู่จังหวัดอะไร",
      ),
    ).resolves.toBe("อุทยานแห่งชาติศรีสัชนาลัยอยู่ในจังหวัดสุโขทัยครับ");
    expect(chat).not.toHaveBeenCalled();
  });

  it("falls back to the guarded LLM prompt when retrieval is unavailable", async () => {
    const chat = vi.fn().mockResolvedValue("ยังตรวจข้อมูลอุทยานไม่ได้ครับ");
    const retrieve = vi.fn().mockRejectedValue(new Error("database offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const responder = new RagChatResponder(
      { chat },
      { retrieve },
    );

    await expect(
      responder.respond([], "ช่วยแนะนำอุทยานสำหรับครอบครัว"),
    ).resolves.toBe("ยังตรวจข้อมูลอุทยานไม่ได้ครับ");

    expect(retrieve).toHaveBeenCalledOnce();
    expect(chat).toHaveBeenCalledOnce();
    expect(chat.mock.calls[0][0].at(-1)).toEqual({
      role: "user",
      content: "ช่วยแนะนำอุทยานสำหรับครอบครัว",
    });

    warn.mockRestore();
  });
});
