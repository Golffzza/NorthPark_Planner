import { describe, expect, it, vi } from "vitest";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import { knowledgeRetriever } from "@/lib/chat/rag/knowledge-retriever";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { InMemoryAssistantV2ConversationStore } from "@/lib/chat-v2/state/conversation-state";
import { createConversationAwareAssistantV2Tools } from "@/lib/chat-v2/tools/conversation-tools";
import { hasExplicitPositionReference } from "@/lib/chat-v2/tools/select-park";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

function makeState(): AssistantV2ConversationState {
  return {
    id: "conversation-1",
    ownerId: "user-1",
    userConstraints: {},
    currentResults: [],
    lastComparedParks: [],
    recentMessages: [],
    createdAt: 0,
    updatedAt: 0,
    expiresAt: 1000,
  };
}

function toolsFor(state: AssistantV2ConversationState, message: string) {
  return createConversationAwareAssistantV2Tools(
    createAssistantV2TurnContext(state, message),
  );
}

const options = { toolCallId: "test-call", messages: [], context: {} };

describe("Assistant V2 conversation tools state", () => {
  it("keeps a selected Chiang Rai park active after a count question", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((park) => park.slug === "doi-luang")!;
    const khun = getParkCatalog().find((park) => park.slug === "khun-chae")!;
    state.currentResults = [doi, khun];
    state.currentResultsOrderVerified = true;
    state.informationParks = [doi, khun];
    state.userConstraints.province = "เชียงราย";
    await toolsFor(state, "แล้วมันมีทั้งหมดกี่ที่อะ")
      .searchParks.execute!({ operation: "COUNT" }, options);
    expect(state.currentResults.map((park) => park.slug)).toEqual(["doi-luang", "khun-chae"]);
    expect(state.currentResultsOrderVerified).toBe(true);
    expect(state.userConstraints.province).toBe("เชียงราย");

    const selected = await toolsFor(state, "ไปดอยหลวง")
      .selectPark.execute!({}, options);
    expect(selected).toMatchObject({ selected: true, park: { slug: "doi-luang" } });
    expect(state.selectedPark?.slug).toBe("doi-luang");
    expect(state.activePark?.slug).toBe("doi-luang");
    expect((await toolsFor(state, "ที่นั่นอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ topic: "province" }, options)))
      .toMatchObject({ found: true, park: { slug: "doi-luang" } });
  });

  it("carries A to B to a pronoun, explicit selection, and an evidenced draft across turns", async () => {
    const state = makeState();
    const a = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    const b = getParkCatalog().find((park) => park.slug === "doi-suthep-pui")!;
    expect(await toolsFor(state, `${a.name} อยู่จังหวัดอะไร`).getParkInfo.execute!({ topic: "province" }, options))
      .toMatchObject({ found: true, park: { slug: a.slug } });
    expect(await toolsFor(state, `${b.name} อยู่จังหวัดอะไร`).getParkInfo.execute!({ topic: "province" }, options))
      .toMatchObject({ found: true, park: { slug: b.slug } });
    expect(await toolsFor(state, "ที่นั่นมีค่าเข้าไหม").getParkInfo.execute!({ topic: "fees" }, options))
      .toMatchObject({ found: true, park: { slug: b.slug } });
    expect(state.selectedPark).toBeUndefined();

    expect(await toolsFor(state, `เลือก${b.name}`).selectPark.execute!({ parkName: b.name }, options))
      .toMatchObject({ selected: true, park: { slug: b.slug } });
    const findByParkSlugs = vi.spyOn(knowledgeRetriever, "findByParkSlugs").mockResolvedValue([{
      id: "verified-activity", documentId: "verified-doc", slug: b.slug,
      parkTitle: b.name, title: "กิจกรรมที่มีหลักฐาน", section: "attraction:WATERFALL:1",
      content: "สถานที่: กิจกรรมที่มีหลักฐาน\n- **summary:** ข้อมูลจากเอกสารทดสอบ",
      similarity: 0.9, rankScore: 1,
    }]);
    try {
      expect(await toolsFor(state, "ช่วยจัดทริป 2 วัน").planTrip.execute!({ durationDays: 2 }, options))
        .toMatchObject({ status: "OK", draftTrip: { park: { slug: b.slug } } });
      expect(findByParkSlugs).toHaveBeenCalledWith([b.slug]);
      expect(state.draftTrip).toMatchObject({ revision: 1, park: { slug: b.slug } });
      expect(state.draftTrip?.verifiedActivities).toEqual([
        { name: "กิจกรรมที่มีหลักฐาน", sourceReference: "verified-doc:verified-activity" },
      ]);
      const before = structuredClone(state.draftTrip);
      expect(await toolsFor(state, `${a.name} อยู่จังหวัดอะไร`).getParkInfo.execute!({ topic: "province" }, options))
        .toMatchObject({ found: true, park: { slug: a.slug } });
      expect(state.selectedPark?.slug).toBe(b.slug);
      expect(state.draftTrip).toEqual(before);
    } finally {
      findByParkSlugs.mockRestore();
    }
  });

  it("does not confuse a two-digit ordinal with its first digit", () => {
    expect(hasExplicitPositionReference("ที่10", 1)).toBe(false);
    expect(hasExplicitPositionReference("ที่10", 10)).toBe(true);
  });

  it("keeps nearby parks as results without selecting the first park", async () => {
    const state = makeState();
    const result = await toolsFor(state, "แนะนำอุทยานใกล้เชียงใหม่")
      .findNearbyParks.execute!({ province: "เชียงใหม่" }, options);

    expect(result).toMatchObject({ status: "OK" });
    expect(result).toMatchObject({
      estimationNote: expect.stringContaining("ไม่ใช่ระยะทางจากเส้นทางถนนจริง"),
    });
    expect(state.currentResults.length).toBeGreaterThan(1);
    expect(state.selectedPark).toBeUndefined();
    for (const park of state.currentResults) {
      expect(park.id).toBe(park.slug);
      expect(getParkCatalog().find((entry) => entry.slug === park.slug)?.id).toBe(park.id);
    }
  });


  it("returns not found for a newly typed unknown park instead of reusing selection", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;

    const result = await toolsFor(state, "อุทยานที่ไม่มีอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ parkName: "อุทยานที่ไม่มี", topic: "province" }, options);

    expect(result).toMatchObject({ found: false, parkName: "อุทยานที่ไม่มี" });
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
  });

  it("uses a newly named park instead of the previously selected park", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    state.draftTrip = {
      park: state.selectedPark,
      durationDays: 1,
      companions: [],
      activities: [],
      days: [],
    };

    const result = await toolsFor(state, "ดอยสุเทพ-ปุยอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ parkName: "ดอยสุเทพ", topic: "province" }, options);

    expect(result).toMatchObject({ found: true, park: { slug: "doi-suthep-pui" } });
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
    expect(state.informationParks?.map((park) => park.slug)).toEqual(["doi-suthep-pui"]);
    expect(state.draftTrip?.park.slug).toBe("doi-inthanon");
  });

  it("resolves the first displayed park as information context without selecting it", async () => {
    const state = makeState();
    state.currentResults = ["chae-son", "doi-khun-tan", "tham-pha-thai"].map((slug) =>
      getParkCatalog().find((park) => park.slug === slug)!);
    state.currentResultsOrderVerified = true;
    state.informationParks = [...state.currentResults];
    state.activePark = undefined;

    const first = await toolsFor(state, "ที่แรกน่าสนใจ เล่าเพิ่มหน่อย")
      .getParkInfo.execute!({ position: 1, topic: "province" }, options);
    expect(first).toMatchObject({ found: true, park: { slug: "chae-son" } });
    expect(state.informationParks?.map((park) => park.slug)).toEqual(["chae-son"]);
    expect(state.selectedPark).toBeUndefined();

    const followup = await toolsFor(state, "แถวนั้นมีค่าเข้าไหม")
      .getParkInfo.execute!({ topic: "fees" }, options);
    expect(followup).toMatchObject({ found: true, park: { slug: "chae-son" } });
  });

  it("follows the last information park across turns without selecting it", async () => {
    const state = makeState();
    const a = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    state.selectedPark = a;
    await toolsFor(state, "ดอยสุเทพ-ปุยอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ topic: "province" }, options);
    const followup = await toolsFor(state, "ที่นั่นมีค่าเข้าไหม")
      .getParkInfo.execute!({ topic: "fees" }, options);
    expect(followup).toMatchObject({ found: true, park: { slug: "doi-suthep-pui" } });
    expect(state.selectedPark?.slug).toBe(a.slug);
  });

  it("follows a park discussed without any selected park, but does not plan it implicitly", async () => {
    const state = makeState();
    await toolsFor(state, "ลานสางอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ topic: "province" }, options);
    expect((await toolsFor(state, "ที่นั่นมีค่าเข้าไหม")
      .getParkInfo.execute!({ topic: "fees" }, options))).toMatchObject({ found: true, park: { slug: "lan-sang" } });
    expect((await toolsFor(state, "ช่วยจัดทริป 2 วัน")
      .planTrip.execute!({ durationDays: 2 }, options))).toMatchObject({ status: "NEEDS_CLARIFICATION" });
    expect(state.selectedPark).toBeUndefined();
    expect(state.draftTrip).toBeUndefined();
  });

  it("does not plan the selected park when 'there' refers to another discussed park", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    await toolsFor(state, "ลานสางอยู่จังหวัดอะไร").getParkInfo.execute!({ topic: "province" }, options);
    const result = await toolsFor(state, "ช่วยจัดทริปที่นั่น 2 วัน")
      .planTrip.execute!({ durationDays: 2 }, options);
    expect(result).toMatchObject({ status: "NEEDS_CLARIFICATION", missing: ["parkName"] });
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
    expect(state.draftTrip).toBeUndefined();
  });

  it("asks again after discussing multiple parks instead of falling back to the selection", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    await toolsFor(state, "ดอยอินทนนท์กับดอยสุเทพ-ปุย ที่ไหนกางเต็นท์ได้")
      .getParkInfo.execute!({ topic: "camping" }, options);
    expect((await toolsFor(state, "ที่นั่นมีค่าเข้าไหม")
      .getParkInfo.execute!({ topic: "fees" }, options)))
      .toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
  });

  it("selects an explicitly named park outside current results", async () => {
    const state = makeState();
    const result = await toolsFor(state, "เลือกแจ้ซ้อน")
      .selectPark.execute!({ parkName: "แจ้ซ้อน" }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "chae-son" } });
    expect(state.selectedPark?.slug).toBe("chae-son");
  });

  it("switches to the verified second park without modifying an existing draft", async () => {
    const state = makeState();
    state.currentResults = ["chae-son", "doi-khun-tan", "doi-chong"].map((slug) =>
      getParkCatalog().find((park) => park.slug === slug)!);
    state.currentResultsOrderVerified = true;
    state.selectedPark = state.currentResults[0];
    state.draftTrip = { park: state.currentResults[0], durationDays: 1, companions: [], activities: [], days: [] };

    const result = await toolsFor(state, "เปลี่ยนอันที่สองได้ไหม")
      .selectPark.execute!({ position: 2 }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "doi-khun-tan" } });
    expect(state.selectedPark?.slug).toBe("doi-khun-tan");
    expect(state.informationParks?.map((park) => park.slug)).toEqual(["doi-khun-tan"]);
    expect(state.draftTrip?.park.slug).toBe("chae-son");
  });

  it("does not select the second park for an information-only request", async () => {
    const state = makeState();
    state.currentResults = ["chae-son", "doi-khun-tan"].map((slug) =>
      getParkCatalog().find((park) => park.slug === slug)!);
    state.currentResultsOrderVerified = true;
    const result = await toolsFor(state, "อันที่สองมีอะไรน่าสนใจ")
      .selectPark.execute!({ position: 2 }, options);
    expect(result).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });

  it("selects the uniquely recommended active park from a contextual reply", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    const suthep = getParkCatalog().find((park) => park.slug === "doi-suthep-pui")!;
    state.currentResults = [doi, suthep];
    state.currentResultsOrderVerified = true;
    state.activePark = suthep;
    state.informationParks = [suthep];
    state.recentMessages = [
      { role: "user", content: "ที่ไหนเหมาะที่สุด" },
      { role: "assistant", content: `แนะนำ${suthep.name} เพราะเหมาะกับการเที่ยวสบาย ๆ` },
    ];
    const result = await toolsFor(state, "เอาที่แนะนำเมื่อกี้แหละ")
      .selectPark.execute!({}, options);
    expect(result).toMatchObject({ selected: true, park: { slug: suthep.slug } });
    expect(state.selectedPark?.slug).toBe(suthep.slug);
  });

  it("selects a single recommended park even when activePark is unset", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    const huai = getParkCatalog().find((park) => park.slug === "huai-nam-dang")!;
    state.currentResults = [doi, huai];
    state.currentResultsOrderVerified = true;
    state.informationParks = [doi, huai];
    state.activePark = undefined;
    state.recentMessages = [
      { role: "assistant", content: `ถ้าให้เลือกเพียงแห่งเดียว ผมขอแนะนำ ${doi.name} ครับ` },
    ];
    const result = await toolsFor(state, "เอาที่แนะนำเมื่อกี้แหละ")
      .selectPark.execute!({ position: 2, parkName: huai.name }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "doi-inthanon" } });
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
    expect(state.informationParks?.map((park) => park.slug)).toEqual(["doi-inthanon"]);
  });

  it("accepts 'งั้นเอาที่บอกเมื่อกี้เลย' after a clearly preferred park in a comparison", async () => {
    const state = makeState();
    const khun = getParkCatalog().find((park) => park.slug === "khun-chae")!;
    const luang = getParkCatalog().find((park) => park.slug === "doi-luang")!;
    state.currentResults = [khun, luang];
    state.currentResultsOrderVerified = true;
    state.informationParks = [khun, luang];
    state.recentMessages = [{
      role: "assistant",
      content: `หากให้เลือกอุทยานที่เหมาะกับทริปครอบครัวระหว่าง 2 แห่งนี้ ${khun.name} จะมีความโดดเด่นเรื่องจุดชมวิวและน้ำตก\nในขณะที่ ${luang.name} เหมาะกับการเดินป่าระยะไกล`,
    }];
    const result = await toolsFor(state, "งั้นเอาที่บอกเมื่อกี้เลย")
      .selectPark.execute!({ parkName: luang.name }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "khun-chae" } });
    expect(state.selectedPark?.slug).toBe("khun-chae");
  });

  it("refuses a contextual choice when the recent answer lists multiple parks", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    const suthep = getParkCatalog().find((park) => park.slug === "doi-suthep-pui")!;
    state.currentResults = [doi, suthep];
    state.currentResultsOrderVerified = true;
    state.activePark = suthep;
    state.informationParks = [suthep];
    state.recentMessages = [{ role: "assistant", content: `อาจเลือก${doi.name}หรือ${suthep.name}` }];
    const result = await toolsFor(state, "เอาที่แนะนำเมื่อกี้แหละ")
      .selectPark.execute!({ parkName: suthep.name }, options);
    expect(result).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });

  it("does not select a park from a negated choice", async () => {
    const state = makeState();
    const result = await toolsFor(state, "ไม่เลือกแจ้ซ้อน")
      .selectPark.execute!({ parkName: "แจ้ซ้อน" }, options);
    expect(result).toMatchObject({ selected: false, reason: "AMBIGUOUS" });
    expect(state.selectedPark).toBeUndefined();
  });

  it("answers a fee follow-up from the selected park without falling back to another park", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "lan-sang")!;

    const result = await toolsFor(state, "ที่นี่มีค่าเข้าไหม")
      .getParkInfo.execute!({ topic: "fees" }, options);

    expect(result).toMatchObject({
      found: true,
      park: { slug: "lan-sang" },
      status: "RECORDED",
      fees: { thaiAdult: 40 },
      currentStatusVerified: false,
    });
    expect(state.selectedPark?.slug).toBe("lan-sang");
  });

  it("uses an explicit ordinal, and rejects a model supplied ordinal without user evidence", async () => {
    const state = makeState();
    state.currentResults = getParkCatalog().filter((park) =>
      ["doi-inthanon", "doi-suthep-pui"].includes(park.slug)
    );
    state.selectedPark = state.currentResults[0];

    const second = await toolsFor(state, "ที่สองอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ position: 2, topic: "province" }, options);
    expect(second).toMatchObject({ found: true, park: { id: state.currentResults[1].id } });

    const ungrounded = await toolsFor(state, "ที่นั่นกางเต็นท์ได้ไหม")
      .getParkInfo.execute!({ position: 1, topic: "province" }, options);
    expect(ungrounded).toMatchObject({ found: true, park: { id: state.currentResults[1].id } });

    const invalid = await toolsFor(state, "ที่สามอยู่จังหวัดอะไร")
      .getParkInfo.execute!({ position: 3, topic: "province" }, options);
    expect(invalid).toMatchObject({ status: "REFERENCE_ERROR", reason: "INVALID_POSITION" });
  });

  it("does not guess when the user mentions two parks", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;

    const result = await toolsFor(state, "ดอยอินทนนท์กับดอยสุเทพ-ปุย ที่ไหนกางเต็นท์ได้")
      .getParkInfo.execute!({ topic: "camping" }, options);

    expect(result).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
  });

  it("does not accept a model supplied park name when several results are unresolved", async () => {
    const state = makeState();
    state.currentResults = getParkCatalog().filter((park) =>
      ["doi-inthanon", "doi-suthep-pui"].includes(park.slug)
    );

    const result = await toolsFor(state, "ที่ไหนกางเต็นท์ได้")
      .getParkInfo.execute!({ parkName: state.currentResults[0].name, topic: "camping" }, options);

    expect(result).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(state.selectedPark).toBeUndefined();
  });

  it("asks which park to plan when only the model supplied a park name", async () => {
    const state = makeState();

    const result = await toolsFor(state, "ช่วยวางแผนเที่ยว")
      .planTrip.execute!({ parkName: "ดอยอินทนนท์" }, options);

    expect(result).toMatchObject({ status: "NEEDS_CLARIFICATION", missing: ["parkName"] });
    expect(state.selectedPark).toBeUndefined();
  });

  it("registers edit and review tools, and protects an existing draft from plan regeneration", async () => {
    const state = makeState();
    const park = getParkCatalog().find((entry) => entry.slug === "doi-inthanon")!;
    state.selectedPark = park;
    state.draftTrip = {
      draftId: "draft-1", revision: 1, park, durationDays: 1,
      companions: [], activities: [],
      verifiedActivities: [{ name: "น้ำตก", sourceReference: "doc:chunk" }],
      days: [{ day: 1, title: "วันที่ 1", items: ["น้ำตก"] }],
    };
    const tools = toolsFor(state, "เพิ่มเป็นสองวัน");
    expect(await tools.planTrip.execute!({ parkName: park.name, durationDays: 2 }, options))
      .toMatchObject({ status: "DRAFT_EXISTS" });
    expect(await tools.updateTripDraft.execute!({ operation: "SET_DURATION", durationDays: 2 }, options))
      .toMatchObject({ status: "OK", draft: { durationDays: 2, revision: 2 } });
    expect(await tools.reviewTripDraft.execute!({}, options))
      .toMatchObject({ status: "OK", draftTrip: { durationDays: 2 } });
    expect(state.selectedPark?.slug).toBe(park.slug);
  });

  it("does not guess which activity to move when a day contains several", async () => {
    const state = makeState();
    const park = getParkCatalog().find((entry) => entry.slug === "lan-sang")!;
    state.draftTrip = {
      draftId: "draft-1", revision: 1, park, durationDays: 2,
      companions: [], activities: [], verifiedActivities: [],
      days: [
        { day: 1, title: "วันที่ 1", items: ["น้ำตกลานสาง", "น้ำตกผาลาด"] },
        { day: 2, title: "วันที่ 2", items: [] },
      ],
    };
    const ambiguous = await toolsFor(state, "ย้ายกิจกรรมจากวันที่ 1 ไปวันที่ 2")
      .updateTripDraft.execute!({ operation: "MOVE_ACTIVITY", fromDay: 1, fromPosition: 2, toDay: 2, toPosition: 1 }, options);
    expect(ambiguous).toMatchObject({ status: "NEEDS_CLARIFICATION" });
    expect(state.draftTrip.revision).toBe(1);
    expect(state.draftTrip.days[0].items).toEqual(["น้ำตกลานสาง", "น้ำตกผาลาด"]);

    const specific = await toolsFor(state, "ย้ายกิจกรรมที่สองของวันที่ 1 ไปวันที่ 2")
      .updateTripDraft.execute!({ operation: "MOVE_ACTIVITY", fromDay: 1, fromPosition: 2, toDay: 2, toPosition: 1 }, options);
    expect(specific).toMatchObject({ status: "OK", draft: { revision: 2 } });
    expect(state.draftTrip.days.map((day) => day.items)).toEqual([["น้ำตกลานสาง"], ["น้ำตกผาลาด"]]);
  });

  it("requires an unambiguous discard request", async () => {
    const state = makeState();
    const park = getParkCatalog().find((entry) => entry.slug === "doi-inthanon")!;
    state.draftTrip = { park, durationDays: 1, companions: [], activities: [], days: [] };
    expect(await toolsFor(state, "ไม่ต้องยกเลิกแผน").discardTripDraft.execute!({}, options))
      .toMatchObject({ status: "NEEDS_EXPLICIT_REQUEST" });
    expect(state.draftTrip).toBeDefined();
    expect(await toolsFor(state, "ยกเลิกแผน").discardTripDraft.execute!({}, options))
      .toMatchObject({ status: "DISCARDED" });
    expect(state.draftTrip).toBeUndefined();
  });

  it("keeps general tourism questions available to RAG without choosing a model supplied park", async () => {
    const state = makeState();
    const retrieve = vi.spyOn(knowledgeRetriever, "retrieve").mockResolvedValue({
      query: "มีข้อมูลการเดินทางทั่วไปไหม",
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

    try {
      const result = await toolsFor(state, "มีข้อมูลการเดินทางทั่วไปไหม")
        .getParkKnowledge.execute!({ parkName: "ดอยอินทนนท์", question: "มีข้อมูลการเดินทางทั่วไปไหม" }, options);

      expect(result).toMatchObject({ status: "OK" });
      expect(result).not.toHaveProperty("park");
      expect(retrieve).toHaveBeenCalledWith("มีข้อมูลการเดินทางทั่วไปไหม", 3, undefined);
      expect(state.selectedPark).toBeUndefined();
    } finally {
      retrieve.mockRestore();
    }
  });

  it("uses broad RAG for an explicitly general question after a park was selected", async () => {
    const state = makeState();
    state.selectedPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    state.currentResults = [state.selectedPark];
    const question = "การเตรียมตัวเที่ยวอุทยานทั่วไปมีอะไรบ้าง";
    const retrieve = vi.spyOn(knowledgeRetriever, "retrieve").mockResolvedValue({
      query: question,
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
    try {
      const result = await toolsFor(state, question).getParkKnowledge.execute!(
        { parkName: state.selectedPark.name, question },
        options,
      );
      expect(result).toMatchObject({ status: "OK" });
      expect(result).not.toHaveProperty("park");
      expect(retrieve).toHaveBeenCalledWith(question, 3, undefined);
    } finally {
      retrieve.mockRestore();
    }
  });

  it("answers RAG about another park without changing selection or draft", async () => {
    const state = makeState();
    const selected = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    state.selectedPark = selected;
    state.draftTrip = { park: selected, durationDays: 1, companions: [], activities: [], days: [] };
    const beforeDraft = structuredClone(state.draftTrip);
    const findByParkSlugs = vi.spyOn(knowledgeRetriever, "findByParkSlugs").mockResolvedValue([{
      id: "chunk-1", documentId: "doc-1", slug: "lan-sang", parkTitle: "ลานสาง",
      title: "ภาพรวม", section: "overview", content: "ข้อมูลทดสอบจากเอกสาร",
      similarity: 1, rankScore: 1,
    }]);
    try {
      const result = await toolsFor(state, "ลานสางเป็นยังไง").getParkKnowledge.execute!(
        { question: "ลานสางเป็นยังไง" }, options,
      );
      expect(result).toMatchObject({ status: "OK", park: { slug: "lan-sang" } });
      expect(state.informationParks?.[0].slug).toBe("lan-sang");
      expect(state.selectedPark?.slug).toBe("doi-inthanon");
      expect(state.draftTrip).toEqual(beforeDraft);
    } finally { findByParkSlugs.mockRestore(); }
  });

  it("clears a previous province when recommendations expand to all northern parks", async () => {
    const state = makeState();
    state.userConstraints.province = "เชียงราย";
    const findByParkSlugs = vi.spyOn(knowledgeRetriever, "findByParkSlugs").mockResolvedValue([]);
    try {
      await toolsFor(state, "แนะนำอุทยานทั่วภาคเหนือ")
        .recommendParks.execute!({}, options);
      expect(state.userConstraints.province).toBeUndefined();
    } finally {
      findByParkSlugs.mockRestore();
    }
  });

  it("keeps the user's selection and unsaved draft when a search changes province", async () => {
    const state = makeState();
    const oldPark = getParkCatalog().find((park) => park.slug === "doi-inthanon")!;
    state.selectedPark = oldPark;
    state.draftTrip = {
      park: oldPark,
      durationDays: 1,
      companions: [],
      activities: [],
      days: [],
    };

    await toolsFor(state, "หาอุทยานในจังหวัดตาก")
      .searchParks.execute!({ province: "ตาก" }, options);

    expect(state.userConstraints.province).toBe("ตาก");
    expect(state.currentResults.every((park) => park.slug !== oldPark.slug)).toBe(true);
    expect(state.selectedPark?.slug).toBe("doi-inthanon");
    expect(state.draftTrip?.park.slug).toBe("doi-inthanon");
  });

  it("uses the province named by the user even when a search tool supplies stale input", async () => {
    const state = makeState();
    state.userConstraints.province = "เชียงใหม่";

    const result = await toolsFor(state, "เปลี่ยนไปจังหวัดตาก มีอุทยานอะไรบ้าง")
      .searchParks.execute!({ province: "เชียงใหม่" }, options);

    expect(result).toMatchObject({ scope: "PROVINCE", province: "ตาก" });
    expect(state.userConstraints.province).toBe("ตาก");
  });

  it("does not mistake the origin province for the requested park province", async () => {
    const state = makeState();
    state.userConstraints.province = "เชียงใหม่";

    const result = await toolsFor(state, "แนะนำอุทยานในตาก เดินทางจากเชียงใหม่")
      .searchParks.execute!({ province: "เชียงใหม่" }, options);

    expect(result).toMatchObject({ province: "ตาก" });
    expect(state.userConstraints.province).toBe("ตาก");
  });

  it("keeps recommendations as choices and updates the province from the user message", async () => {
    const state = makeState();
    state.userConstraints.province = "เชียงใหม่";

    await toolsFor(state, "แนะนำอุทยานในจังหวัดตาก")
      .recommendParks.execute!({ province: "เชียงใหม่" }, options);

    expect(state.userConstraints.province).toBe("ตาก");
    expect(state.selectedPark).toBeUndefined();
    expect(state.currentResults.every((park) => park.id === park.slug)).toBe(true);
  });

  it("selects an explicitly chosen result while preserving another park's unsaved draft", async () => {
    const state = makeState();
    state.currentResults = getParkCatalog().filter((park) =>
      ["doi-inthanon", "doi-suthep-pui"].includes(park.slug)
    );
    state.currentResultsOrderVerified = true;
    state.draftTrip = {
      park: state.currentResults[0],
      durationDays: 1,
      companions: [],
      activities: [],
      days: [],
    };

    const result = await toolsFor(state, "เอาที่สอง")
      .selectPark.execute!({ position: 2 }, options);

    expect(result).toMatchObject({ selected: true, park: { id: state.currentResults[1].id } });
    expect(state.selectedPark?.id).toBe(state.currentResults[1].id);
    expect(state.draftTrip?.park.id).toBe(state.currentResults[0].id);
  });

  it("does not overwrite an unsaved draft after switching the selected park", async () => {
    const state = makeState();
    const oldPark = getParkCatalog().find((park) => park.slug === "chae-son")!;
    const newPark = getParkCatalog().find((park) => park.slug === "doi-khun-tan")!;
    state.currentResults = [oldPark, newPark];
    state.currentResultsOrderVerified = true;
    state.selectedPark = oldPark;
    state.draftTrip = { park: oldPark, durationDays: 1, companions: [], activities: [], days: [] };
    const before = structuredClone(state.draftTrip);

    const selected = await toolsFor(state, "เปลี่ยนอันที่สองได้ไหม")
      .selectPark.execute!({ position: 2 }, options);
    expect(selected).toMatchObject({ selected: true, park: { slug: "doi-khun-tan" } });

    const planned = await toolsFor(state, "ช่วยจัดทริป 1 วัน")
      .planTrip.execute!({ durationDays: 1 }, options);
    expect(planned).toMatchObject({ status: "DRAFT_EXISTS", draftTrip: { park: { slug: "chae-son" } } });
    expect(state.selectedPark?.slug).toBe("doi-khun-tan");
    expect(state.draftTrip).toEqual(before);
  });

  it("does not let a model select a result the user did not choose", async () => {
    const state = makeState();
    state.currentResults = [getParkCatalog().find((park) => park.slug === "doi-inthanon")!];

    const byPosition = await toolsFor(state, "แนะนำอุทยานหน่อย")
      .selectPark.execute!({ position: 1 }, options);
    const byName = await toolsFor(state, "แนะนำอุทยานหน่อย")
      .selectPark.execute!({ parkName: state.currentResults[0].name }, options);

    expect(byPosition).toMatchObject({ selected: false, reason: "AMBIGUOUS" });
    expect(byName).toMatchObject({ selected: false, reason: "AMBIGUOUS" });
    expect(state.selectedPark).toBeUndefined();
  });

  it("serializes multiple tool writes in a turn and preserves state across turns", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "user-1", async (state) => state.id);

    await store.runTurn(id, "user-1", async (state) => {
      const tools = toolsFor(state, "ดอยอินทนนท์อยู่จังหวัดอะไร");
      await Promise.all([
        tools.searchParks.execute!({ province: "เชียงใหม่" }, options),
        tools.getParkInfo.execute!({ parkName: "ดอยอินทนนท์", topic: "province" }, options),
      ]);
    });

    const persisted = await store.runTurn(id, "user-1", async (state) => ({
      province: state.userConstraints.province,
      resultCount: state.currentResults.length,
      selectedPark: state.selectedPark?.slug,
      informationPark: state.informationParks?.[0]?.slug,
    }));

    expect(persisted).toEqual({
      province: "เชียงใหม่",
      resultCount: expect.any(Number),
      selectedPark: undefined,
      informationPark: "doi-inthanon",
    });
    expect(persisted.resultCount).toBeGreaterThan(0);
  });
});
