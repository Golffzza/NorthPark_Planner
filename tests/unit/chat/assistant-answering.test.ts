import { describe, expect, it, vi } from "vitest";
import { AssistantCoreService } from "@/lib/chat/core/assistant-core-service";
import { RagChatResponder } from "@/lib/chat/rag/rag-chat-responder";
import { OllamaProvider } from "@/lib/chat/llm/ollama-provider";
import { OllamaEmbeddingProvider } from "@/lib/chat/rag/ollama-embedding-provider";

function setup() {
  const chat = vi.fn().mockResolvedValue("คำตอบจากหลักฐาน");
  const retrieve = vi.fn().mockRejectedValue(new Error("offline"));
  const analyze = vi.fn().mockResolvedValue({ intent: "GENERAL", confidence: 0.9, source: "LLM" });
  return { chat, retrieve, analyze, core: new AssistantCoreService({ analyze }, new RagChatResponder({ chat }, { retrieve })) };
}

describe("bounded, grounded assistant answering", () => {
  it("greets without retrieval, classification, generation or unrelated sources", async () => {
    const s = setup();
    const answer = await s.core.respond([], {}, "สวัสดีครับ");
    expect(answer.message).toContain("สวัสดี");
    expect(answer.sources).toBeUndefined();
    expect(s.chat).not.toHaveBeenCalled();
    expect(s.retrieve).not.toHaveBeenCalled();
    expect(s.analyze).not.toHaveBeenCalled();
  });

  it("clarifies a vague general request without running the RAG pipeline", async () => {
    const s = setup();
    const answer = await s.core.respond([], {}, "ช่วยคิดหน่อย");
    expect(answer.message).toContain("จังหวัด");
    expect(answer.message).toContain("กิจกรรม");
    expect(s.chat).not.toHaveBeenCalled();
    expect(s.retrieve).not.toHaveBeenCalled();
    expect(s.analyze).not.toHaveBeenCalled();
  });

  it("answers province from canonical facts without any model calls", async () => {
    const s = setup();
    const answer = await s.core.respond([], {}, "ดอยอินทนนท์อยู่จังหวัดอะไร");
    expect(answer.message).toContain("เชียงใหม่");
    expect(s.chat).not.toHaveBeenCalled();
    expect(s.retrieve).not.toHaveBeenCalled();
  });

  it("does not ask an ungrounded model when knowledge is unavailable", async () => {
    const s = setup();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const answer = await s.core.respond([], {}, "ดอยอินทนนท์มีอะไรบ้าง");
      expect(answer.message).toMatch(/ไม่.*ข้อมูล|ข้อมูล.*ไม่/);
      expect(s.chat).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });

  it("contains direct park lookup failures instead of rejecting the assistant request", async () => {
    const chat = vi.fn().mockResolvedValue("ไม่ควรถูกเรียก");
    const retrieve = vi.fn().mockRejectedValue(new Error("database offline"));
    const findByParkSlugs = vi.fn().mockRejectedValue(new Error("database offline"));
    const core = new AssistantCoreService(
      { analyze: vi.fn() },
      new RagChatResponder({ chat }, { retrieve, findByParkSlugs }),
    );
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const answer = await core.respond([], {}, "ดอยอินทนนท์มีอะไรบ้าง");
      expect(answer.message).toMatch(/ไม่.*ข้อมูล|ข้อมูล.*ไม่/);
      expect(chat).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it("does not substitute previous recommendations for an explicit unmatched comparison", async () => {
    const s = setup();
    const answer = await s.core.respond([], { lastRecommendedParks: [
      { id: "mae-wang", slug: "mae-wang", name: "แม่วาง" },
      { id: "si-lanna", slug: "si-lanna", name: "ศรีลานนา" },
    ] }, "เปรียบเทียบดอยอินทนนท์กับอุทยานสมมติ");
    expect(answer.comparison).toBeUndefined();
    expect(answer.message).toContain("สองแห่ง");
  });

  it("sends JSON mode and bounded per-call options to Ollama", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: { content: "{}" } })));
    try {
      await new OllamaProvider().chat([], { format: "json", numPredict: 48, temperature: 0, timeoutMs: 1000 });
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.format).toBe("json");
      expect(body.options).toMatchObject({ num_predict: 48, temperature: 0 });
    } finally { fetchMock.mockRestore(); }
  });
  it("prepares Ollama once in the background and keeps the warmed model loaded", async () => {
    const previousKeepAlive = process.env.OLLAMA_KEEP_ALIVE;
    const previousModel = process.env.OLLAMA_MODEL;
    process.env.OLLAMA_KEEP_ALIVE = "30m";
    delete process.env.OLLAMA_MODEL;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      response: "พร้อม",
      done: true,
    })));
    const provider = new OllamaProvider() as OllamaProvider & {
      prepare(): Promise<void>;
      isPrepared(): boolean;
    };
    try {
      expect(provider.isPrepared()).toBe(false);
      await Promise.all([provider.prepare(), provider.prepare()]);
      expect(provider.isPrepared()).toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/generate$/);
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body).toMatchObject({
        model: "llama3.2:3b",
        stream: false,
        keep_alive: "30m",
        options: { num_predict: 1 },
      });
    } finally {
      if (previousKeepAlive === undefined) delete process.env.OLLAMA_KEEP_ALIVE;
      else process.env.OLLAMA_KEEP_ALIVE = previousKeepAlive;
      if (previousModel === undefined) delete process.env.OLLAMA_MODEL;
      else process.env.OLLAMA_MODEL = previousModel;
      fetchMock.mockRestore();
    }
  });
  it("expires the prepared state when Ollama keep-alive has elapsed", async () => {
    const previousKeepAlive = process.env.OLLAMA_KEEP_ALIVE;
    process.env.OLLAMA_KEEP_ALIVE = "1s";
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      response: "พร้อม",
      done: true,
    })));
    const provider = new OllamaProvider() as OllamaProvider & {
      prepare(): Promise<void>;
      isPrepared(): boolean;
    };
    try {
      await provider.prepare();
      expect(provider.isPrepared()).toBe(true);
      vi.advanceTimersByTime(1_001);
      expect(provider.isPrepared()).toBe(false);
    } finally {
      vi.useRealTimers();
      if (previousKeepAlive === undefined) delete process.env.OLLAMA_KEEP_ALIVE;
      else process.env.OLLAMA_KEEP_ALIVE = previousKeepAlive;
      fetchMock.mockRestore();
    }
  });
  it("rejects an Ollama response truncated by the token limit", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      message: { content: "คำตอบที่ยังไม่จบ" }, done_reason: "length",
    })));
    try {
      await expect(new OllamaProvider().chat([])).rejects.toThrow(/token limit/i);
    } finally { fetchMock.mockRestore(); }
  });
  it("uses a short configurable keep-alive for the embedding model", async () => {
    const previousKeepAlive = process.env.OLLAMA_EMBEDDING_KEEP_ALIVE;
    process.env.OLLAMA_EMBEDDING_KEEP_ALIVE = "1m";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      embeddings: [new Array(768).fill(0)],
    })));
    try {
      await new OllamaEmbeddingProvider().embed("คำถามทดสอบ");
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body.keep_alive).toBe("1m");
    } finally {
      if (previousKeepAlive === undefined) delete process.env.OLLAMA_EMBEDDING_KEEP_ALIVE;
      else process.env.OLLAMA_EMBEDDING_KEEP_ALIVE = previousKeepAlive;
      fetchMock.mockRestore();
    }
  });

  it("rejects a grounded rewrite that inserts another known park", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติดอยอินทนนท์เหมาะที่สุด") },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติแม่วางมีผาช่อ";
    const result = await responder.composeGrounded("แม่วางมีอะไร", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ",
      similarity: 1, rankScore: 1,
    }]);
    expect(result).toBe(draft);
  });

  it("rejects an LLM summary that broadens suitability to everyone", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติดอยอินทนนท์เหมาะสำหรับทุกคนครับ") },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติดอยอินทนนท์เหมาะกับคนที่ต้องการเที่ยวหลายรูปแบบ";
    const result = await responder.composeGrounded("ทำไมถึงน่าไป", draft, [{
      id: "c1", documentId: "d1", slug: "doi-inthanon",
      parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "เหมาะกับใคร",
      section: "suitability", content: "เหมาะกับคนที่ต้องการเที่ยวหลายรูปแบบ",
      similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(draft);
  });

  it("does not reinterpret a request for a short answer as a short trip", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("เที่ยวได้ในช่วงเวลาสั้น ๆ ครับ") },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติดอยอินทนนท์มีน้ำตก จุดชมวิว และเส้นทางศึกษาธรรมชาติ";
    const result = await responder.composeGrounded("บอกสั้นๆว่าทำไมถึงน่าไป", draft, [{
      id: "c1", documentId: "d1", slug: "doi-inthanon",
      parkTitle: "อุทยานแห่งชาติดอยอินทนนท์", title: "ภาพรวม",
      section: "overview", content: draft, similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(draft);
  });

  it("asks the LLM for a concise answer-specific summary before the verified details", async () => {
    const chat = vi.fn().mockResolvedValue(
      "ถ้าอยากเดินไม่ไกล ผาช่อในอุทยานแห่งชาติแม่วางเป็นจุดที่น่าพิจารณาครับ",
    );
    const responder = new RagChatResponder(
      { chat },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติแม่วาง: ผาช่อ เดินประมาณ 400 เมตร";
    const result = await responder.composeGrounded("แม่วางมีอะไร", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ\n- **walking:** 400 เมตร",
      similarity: 1, rankScore: 1,
    }]);
    expect(result).toBe(
      `ถ้าอยากเดินไม่ไกล ผาช่อในอุทยานแห่งชาติแม่วางเป็นจุดที่น่าพิจารณาครับ\n\n${draft}`,
    );
    const messages = chat.mock.calls[0][0];
    expect(messages[0].content).toContain("สรุปคำตอบ");
    expect(messages[0].content).toContain("ตอบคำถามโดยตรง");
    expect(messages[0].content).not.toContain("ประโยคเกริ่น");
    expect(messages[0].content).not.toContain("Trip Evaluation");
  });

  it("returns the verified draft immediately while a real provider is still warming", async () => {
    const chat = vi.fn().mockResolvedValue("คำตอบที่ไม่ควรถูกเรียก");
    const prepare = vi.fn().mockResolvedValue(undefined);
    const responder = new RagChatResponder(
      { chat, prepare, isPrepared: () => false },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติแม่วาง: ผาช่อ";

    const result = await responder.composeGrounded("แม่วางมีอะไร", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ",
      similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(draft);
    expect(prepare).toHaveBeenCalledOnce();
    expect(chat).not.toHaveBeenCalled();
  });

  it("does not duplicate the verified draft when the LLM copies it", async () => {
    const draft = "อุทยานแห่งชาติแม่วาง: ผาช่อ เดินประมาณ 400 เมตร";
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue(draft) },
      { retrieve: vi.fn() },
    );
    const result = await responder.composeGrounded("แม่วางมีอะไร", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ\n- **walking:** 400 เมตร",
      similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(draft);
  });

  it("falls back to the verified draft for an empty or internal-process LLM summary", async () => {
    const draft = "อุทยานแห่งชาติแม่วาง: ผาช่อ";
    const chunk = {
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ",
      similarity: 1, rankScore: 1,
    };
    const emptyResponder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("   ") },
      { retrieve: vi.fn() },
    );
    const leakingResponder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("จาก E1 และ RAG พบว่าผาช่อน่าสนใจครับ") },
      { retrieve: vi.fn() },
    );

    await expect(emptyResponder.composeGrounded("แม่วางมีอะไร", draft, [chunk])).resolves.toBe(draft);
    await expect(leakingResponder.composeGrounded("แม่วางมีอะไร", draft, [chunk])).resolves.toBe(draft);
  });

  it("keeps every park in the verified comparison even when the introduction names one", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติแม่วางมีเส้นทางเดิน") },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติแม่วางเดิน 400 เมตร ส่วนอุทยานแห่งชาติดอยอินทนนท์ขึ้นกับจุด";
    const result = await responder.composeGrounded("เปรียบเทียบสองแห่ง", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ\n- **walking:** 400 เมตร",
      similarity: 1, rankScore: 1,
    }]);
    expect(result).toContain("อุทยานแห่งชาติแม่วาง");
    expect(result).toContain("อุทยานแห่งชาติดอยอินทนนท์");
    expect(result.endsWith(draft)).toBe(true);
  });
  it("allows a grounded comparison summary to mention every compared park", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("แม่วางและดอยอินทนนท์มีระยะเดินต่างกันตามจุดท่องเที่ยวครับ") },
      { retrieve: vi.fn() },
    );
    const draft = "1) อุทยานแห่งชาติแม่วาง — ผาช่อ เดิน 400 เมตร\n2) อุทยานแห่งชาติดอยอินทนนท์ — ระยะเดินขึ้นกับจุด\nควรเทียบเป็นรายจุดท่องเที่ยว";
    const result = await responder.composeGrounded("เปรียบเทียบแม่วางกับดอยอินทนนท์", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ\n- **walking:** 400 เมตร",
      similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(`แม่วางและดอยอินทนนท์มีระยะเดินต่างกันตามจุดท่องเที่ยวครับ\n\n${draft}`);
  });
  it("always preserves the per-attraction caveat from the verified draft", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติแม่วางเดินน้อยกว่าอุทยานแห่งชาติดอยอินทนนท์") },
      { retrieve: vi.fn() },
    );
    const draft = "อุทยานแห่งชาติแม่วางและอุทยานแห่งชาติดอยอินทนนท์ต้องเปรียบเทียบเป็นรายจุดท่องเที่ยว";
    const result = await responder.composeGrounded("ที่ไหนเดินน้อยกว่า", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ",
      similarity: 1, rankScore: 1,
    }]);
    expect(result).toContain("รายจุดท่องเที่ยว");
    expect(result.endsWith(draft)).toBe(true);
  });
  it("rejects an introduction that highlights a lower-ranked park", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติดอยอินทนนท์เป็นตัวเลือกที่น่าสนใจครับ") },
      { retrieve: vi.fn() },
    );
    const draft = "1) อุทยานแห่งชาติแม่วาง\n2) อุทยานแห่งชาติดอยอินทนนท์";
    const result = await responder.composeGrounded("ช่วยแนะนำ", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ",
      similarity: 1, rankScore: 1,
    }]);
    expect(result).toBe(draft);
  });

  it("does not turn a superlative from the user question into a verified park claim", async () => {
    const responder = new RagChatResponder(
      { chat: vi.fn().mockResolvedValue("อุทยานแห่งชาติแม่วางมีระยะเดินน้อยที่สุดครับ") },
      { retrieve: vi.fn() },
    );
    const draft = "1) อุทยานแห่งชาติแม่วาง — ผาช่อ เดิน 400 เมตร\n2) อุทยานแห่งชาติดอยอินทนนท์ — ระยะเดินขึ้นกับจุด";
    const result = await responder.composeGrounded("ที่ไหนเดินน้อยที่สุด", draft, [{
      id: "c1", documentId: "d1", slug: "mae-wang", parkTitle: "อุทยานแห่งชาติแม่วาง",
      title: "ผาช่อ", section: "attraction:GEOLOGY:A01", content: "สถานที่: ผาช่อ\n- **walking:** 400 เมตร",
      similarity: 1, rankScore: 1,
    }]);

    expect(result).toBe(draft);
  });

  it("forwards the turn abort signal into semantic retrieval", async () => {
    const signal = new AbortController().signal;
    const retrieve = vi.fn().mockResolvedValue({
      query: "คำถามทั่วไป",
      mode: "EXPLORATORY",
      explicitProvinces: [],
      requiresLiveVerification: false,
      analysis: {
        intent: "GENERAL_INFO",
        activityTypes: [],
        preferredTags: [],
        effort: "ANY",
        requiresLiveVerification: false,
      },
      chunks: [],
    });
    const responder = new RagChatResponder({ chat: vi.fn() }, { retrieve });

    await responder.retrieveOnly([], "คำถามทั่วไป", signal);

    expect(retrieve).toHaveBeenCalledWith("คำถามทั่วไป", 4, signal);
  });
});
