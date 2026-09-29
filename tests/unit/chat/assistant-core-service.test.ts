import { describe, expect, it, vi } from "vitest";

import { AssistantCoreService } from "@/lib/chat/core/assistant-core-service";
import type { AssistantIntentAnalyzer } from "@/lib/chat/core/assistant-intent";
import type { RagChatResponder } from "@/lib/chat/rag/rag-chat-responder";
import type { AssistantContext } from "@/lib/chat/shared/contracts";

function createCore() {
  const analyzer: AssistantIntentAnalyzer = {
    analyze: vi.fn().mockResolvedValue({
      intent: "GENERAL",
      confidence: 0.5,
      source: "LLM",
    }),
  };
  const rag = {
    respondDetailed: vi.fn().mockResolvedValue({ message: "คำตอบจากฐานความรู้" }),
    retrieveOnly: vi.fn().mockResolvedValue(undefined),
    retrieveParkChunks: vi.fn().mockResolvedValue([
      {
        id: "c-inthanon", documentId: "d-inthanon", slug: "doi-inthanon",
        parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "น้ำตกทดสอบ",
        section: "attraction:WATERFALL:A01",
        content: "สถานที่: น้ำตกทดสอบ\n- **summary:** น้ำตกในอุทยาน\n- **walking:** 200 เมตร\n- **difficulty:** LOW\n- **source_ids:** S01",
        similarity: 1, rankScore: 1,
      },
      {
        id: "c-suthep", documentId: "d-suthep", slug: "doi-suthep-pui",
        parkTitle: "อุทยานแห่งชาติดอยสุเทพ-ปุย", title: "จุดชมวิวทดสอบ",
        section: "attraction:VIEWPOINT:A01",
        content: "สถานที่: จุดชมวิวทดสอบ\n- **summary:** จุดชมวิว\n- **walking:** 100 เมตร\n- **difficulty:** LOW\n- **source_ids:** S01",
        similarity: 1, rankScore: 1,
      },
    ]),
    composeGrounded: vi.fn().mockImplementation(async (_question, draft) => draft),
  } as unknown as RagChatResponder;
  return { core: new AssistantCoreService(analyzer, rag), analyzer, rag };
}

describe("AssistantCoreService", () => {
  it("preserves recommendation constraints and compares prior references", async () => {
    const { core, analyzer } = createCore();
    let context: AssistantContext = {};

    const first = await core.respond([], context, "อยากเที่ยวเชียงใหม่");
    context = first.context;
    const second = await core.respond([], context, "เอาที่เดินไม่เยอะ");
    context = second.context;
    const third = await core.respond([], context, "ไปกับพ่อแม่");
    context = third.context;

    expect(context.userConstraints).toMatchObject({
      province: "เชียงใหม่",
      fatigue: "LOW",
      companions: ["FAMILY", "ELDERLY"],
    });
    expect(third.recommendations?.length).toBeGreaterThanOrEqual(2);
    expect(third.message).not.toContain("เหตุผล:");
    expect(third.message).not.toContain("ความยาก LOW");

    const compared = await core.respond([], context, "สองที่แรกต่างกันยังไง");
    expect(compared.comparison?.parks).toHaveLength(2);
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it("overrides only the explicitly changed province", async () => {
    const { core } = createCore();
    const result = await core.respond(
      [],
      {
        userConstraints: {
          province: "เชียงใหม่",
          fatigue: "LOW",
          companions: ["FAMILY"],
        },
      },
      "เปลี่ยนเป็นเชียงราย",
    );

    expect(result.context.userConstraints).toEqual({
      province: "เชียงราย",
      fatigue: "LOW",
      companions: ["FAMILY"],
    });
  });

  it("asks for clarification instead of guessing an unresolved reference", async () => {
    const { core } = createCore();
    const result = await core.respond([], {}, "เอาอันนั้น");
    expect(result.message).toContain("อุทยานไหน");
  });

  it("returns only registry-backed sources from RAG evidence", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockResolvedValue([
          {
            id: "c1",
            documentId: "d1",
            slug: "doi-inthanon",
            parkTitle: "อุทยานแห่งชาติดอยอินทนนท์",
            title: "ยอดดอย",
            section: "attraction:VIEWPOINT:A01",
            content: "- **source_ids:** S01, UNKNOWN",
            similarity: 0.9,
            rankScore: 1,
          },
    ]);

    const result = await core.respond([], {}, "ดอยอินทนนท์มีอะไรบ้าง");
    expect(result.sources?.map((source) => source.id)).toEqual([
      "doi-inthanon:S01",
    ]);
  });

  it("uses the resolved structured reference without ambiguous text history", async () => {
    const { core, rag } = createCore();
    await core.respond(
      [{ role: "assistant", content: "1. ดอยสุเทพ 2. แม่วาง" }],
      {
        lastRecommendedParks: [
          { id: "doi-suthep-pui", slug: "doi-suthep-pui", name: "อุทยานแห่งชาติดอยสุเทพ-ปุย" },
          { id: "mae-wang", slug: "mae-wang", name: "อุทยานแห่งชาติแม่วาง" },
        ],
      },
      "อันที่สองมีกิจกรรมอะไรบ้าง",
    );

    expect(rag.retrieveParkChunks).toHaveBeenCalledWith(["mae-wang"]);
    expect(rag.retrieveOnly).not.toHaveBeenCalled();
  });

  it("includes the actual body of a general park-information section", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockResolvedValue([{
      id: "c-access",
      documentId: "d-inthanon",
      slug: "doi-inthanon",
      parkTitle: "อุทยานแห่งชาติดอยอินทนนท์",
      title: "การเดินทางและการเข้าถึง",
      section: "access",
      content: [
        "park_slug: doi-inthanon",
        "section: access",
        "",
        "## 5. การเดินทางและการเข้าถึง",
        "",
        "ถนนขึ้นอุทยานลาดชันและมีโค้งหลายช่วง ควรตรวจสภาพรถก่อนเดินทาง",
        "",
        "**Route policy**",
        "- ข้อกำหนดภายในที่ไม่ควรแสดงแก่ผู้ใช้",
      ].join("\n"),
      similarity: 1,
      rankScore: 1,
    }]);

    const result = await core.respond([], {}, "ดอยอินทนนท์เดินทางยังไง");

    expect(result.message).toContain("ถนนขึ้นอุทยานลาดชันและมีโค้งหลายช่วง");
    expect(result.message).not.toContain("park_slug");
    expect(result.message).not.toContain("Route policy");
  });

  it("does not expose static-RAG placeholders or markdown field names in live-status answers", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockResolvedValue([{
      id: "c-dynamic",
      documentId: "d-inthanon",
      slug: "doi-inthanon",
      parkTitle: "อุทยานแห่งชาติดอยอินทนนท์",
      title: "ข้อมูลที่เปลี่ยนแปลงได้ (Dynamic)",
      section: "dynamic",
      content: [
        "park_slug: doi-inthanon",
        "section: dynamic",
        "",
        "## 11. ข้อมูลที่เปลี่ยนแปลงได้ (Dynamic)",
        "",
        "- **last_known_status_note:** ไม่บันทึกสถานะเปิด-ปิดปัจจุบันเป็นข้อมูลถาวร",
        "- **opening_hours_today:** `UNKNOWN_IN_STATIC_RAG`",
        "- **weather_now:** `USE_WEATHER_TOOL`",
      ].join("\n"),
      similarity: 1,
      rankScore: 1,
    }]);

    const result = await core.respond([], {}, "ดอยอินทนนท์เปิดกี่โมงวันนี้");

    expect(result.message).toContain("ไม่บันทึกสถานะเปิด-ปิดปัจจุบันเป็นข้อมูลถาวร");
    expect(result.message).toContain("ยังต้องตรวจสอบกับอุทยานโดยตรง");
    expect(result.message).not.toContain("UNKNOWN_IN_STATIC_RAG");
    expect(result.message).not.toContain("USE_WEATHER_TOOL");
    expect(result.message).not.toContain("last_known_status_note");
    expect(result.message).not.toContain("**");
  });

  it("does not turn a park-information question into future recommendation preferences", async () => {
    const { core } = createCore();

    const parkInfo = await core.respond([], {}, "ดอยอินทนนท์มีน้ำตกอะไรบ้าง");
    expect(parkInfo.context.userConstraints?.activities).toBeUndefined();

    const recommendation = await core.respond([], parkInfo.context, "แนะนำอุทยานที่เชียงใหม่");
    expect(recommendation.context.userConstraints).toMatchObject({ province: "เชียงใหม่" });
    expect(recommendation.context.userConstraints?.activities).toBeUndefined();
  });

  it("returns a safe comparison response when direct knowledge retrieval fails", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockRejectedValue(new Error("database offline"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const result = await core.respond(
        [],
        {},
        "เปรียบเทียบดอยอินทนนท์กับดอยสุเทพ",
      );
      expect(result.comparison).toBeUndefined();
      expect(result.message).toContain("ข้อมูลอ้างอิงเพียงพอ");
    } finally {
      warning.mockRestore();
    }
  });

  it.each([
    "มีที่พักไหม",
    "มีน้ำตกไหม",
    "เดินทางไปยังไง",
    "เปิดกี่โมง",
    "แล้วที่พักล่ะ",
    "ทำไมถึงน่าไปอะ",
    "บอกหน่อยทำไมถึงต้องไป",
    "เล่าให้ฟังหน่อยว่ามันพิเศษยังไง",
  ])(
    "keeps the active park for the follow-up question: %s",
    async (followUp) => {
      const { core, rag } = createCore();
      const activePark = {
        id: "doi-inthanon",
        slug: "doi-inthanon",
        name: "อุทยานแห่งชาติดอยอินทนนท์",
      };
      const result = await core.respond([], {
        selectedPark: activePark,
        lastParkResults: [activePark],
      }, followUp);

      expect(result.context.lastIntent).toBe("PARK_INFO");
      expect(rag.retrieveParkChunks).toHaveBeenCalledWith(["doi-inthanon"]);
    },
  );

  it("asks which park instead of treating an ambiguous park follow-up as a general request", async () => {
    const { core, rag } = createCore();
    const result = await core.respond([], {
      lastParkResults: [
        { id: "doi-inthanon", slug: "doi-inthanon", name: "อุทยานแห่งชาติดอยอินทนนท์" },
        { id: "doi-suthep-pui", slug: "doi-suthep-pui", name: "อุทยานแห่งชาติดอยสุเทพ-ปุย" },
      ],
    }, "ทำไมถึงน่าไปอะ");

    expect(result.message).toContain("อุทยานไหน");
    expect(rag.retrieveParkChunks).not.toHaveBeenCalled();
  });

  it("uses overview, suitability and attraction evidence to explain why an active park is worth considering", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockResolvedValue([
      {
        id: "overview", documentId: "d1", slug: "doi-inthanon",
        parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "ภาพรวม", section: "overview",
        content: "## 1. ภาพรวม\nมีธรรมชาติหลายรูปแบบ", similarity: 1, rankScore: 1,
      },
      {
        id: "suitability", documentId: "d1", slug: "doi-inthanon",
        parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "เหมาะกับใคร", section: "suitability",
        content: "## 7. เหมาะกับใคร\n- คนที่ต้องการเที่ยวหลายรูปแบบ", similarity: 1, rankScore: 1,
      },
      {
        id: "attraction", documentId: "d1", slug: "doi-inthanon",
        parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "น้ำตกทดสอบ",
        section: "attraction:WATERFALL:A01",
        content: "สถานที่: น้ำตกทดสอบ\n- **summary:** น้ำตกในอุทยาน",
        similarity: 1, rankScore: 1,
      },
    ]);
    const activePark = {
      id: "doi-inthanon",
      slug: "doi-inthanon",
      name: "อุทยานแห่งชาติดอยอินทนนท์",
    };

    const result = await core.respond([], {
      selectedPark: activePark,
      lastParkResults: [activePark],
    }, "ทำไมถึงน่าไปอะ");

    expect(result.context.lastIntent).toBe("PARK_INFO");
    const composeCall = vi.mocked(rag.composeGrounded).mock.calls[0];
    const draft = composeCall[1];
    const evidence = composeCall[2];
    expect(draft).toContain("เหตุผลที่น่าพิจารณา");
    expect(draft).toContain("น้ำตกทดสอบ");
    expect(draft).not.toContain("พบข้อมูลดังนี้");
    expect(evidence.map((chunk) => chunk.section)).toEqual(expect.arrayContaining([
      "overview",
      "suitability",
      "attraction:WATERFALL:A01",
    ]));
  });

  it("sends only question-relevant attraction evidence to comparison grounding", async () => {
    const { core, rag } = createCore();
    vi.mocked(rag.retrieveParkChunks).mockResolvedValue([
      {
        id: "mw-waterfall", documentId: "mw", slug: "mae-wang", parkTitle: "แม่วาง",
        title: "น้ำตกแม่วาง", section: "attraction:WATERFALL:A01",
        content: "สถานที่: น้ำตกแม่วาง\n- **difficulty:** LOW\n- **walking:** 100 เมตร",
        similarity: 1, rankScore: 1,
      },
      {
        id: "mw-cave", documentId: "mw", slug: "mae-wang", parkTitle: "แม่วาง",
        title: "ถ้ำแม่วาง", section: "attraction:CAVE:A02",
        content: "สถานที่: ถ้ำแม่วาง\n- **difficulty:** LOW\n- **walking:** 100 เมตร",
        similarity: 1, rankScore: 1,
      },
      {
        id: "di-waterfall", documentId: "di", slug: "doi-inthanon", parkTitle: "ดอยอินทนนท์",
        title: "น้ำตกอินทนนท์", section: "attraction:WATERFALL:A01",
        content: "สถานที่: น้ำตกอินทนนท์\n- **difficulty:** LOW\n- **walking:** 100 เมตร",
        similarity: 1, rankScore: 1,
      },
      {
        id: "di-trail", documentId: "di", slug: "doi-inthanon", parkTitle: "ดอยอินทนนท์",
        title: "ทางเดินอินทนนท์", section: "attraction:TRAIL:A02",
        content: "สถานที่: ทางเดินอินทนนท์\n- **difficulty:** LOW\n- **walking:** 100 เมตร",
        similarity: 1, rankScore: 1,
      },
    ]);

    await core.respond([], {}, "เปรียบเทียบแม่วางกับดอยอินทนนท์เรื่องน้ำตก");

    const groundedEvidence = vi.mocked(rag.composeGrounded).mock.calls[0][2];
    expect(groundedEvidence.every((chunk) => chunk.section.includes("WATERFALL"))).toBe(true);
  });
});
