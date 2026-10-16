import { describe, expect, it } from "vitest";
import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { reconcileRecommendedPark } from "@/lib/chat-v2/application/recommendation-decision";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

const khun = getParkCatalog().find((park) => park.slug === "khun-chae")!;
const luang = getParkCatalog().find((park) => park.slug === "doi-luang")!;
function makeState(): AssistantV2ConversationState {
  return { id: "test", ownerId: "test", userConstraints: {}, currentResults: [khun, luang],
    currentResultsOrderVerified: true, informationParks: [khun, luang],
    lastComparedParks: [], recentMessages: [], createdAt: 0, updatedAt: 0, expiresAt: 1000 };
}
const request = "จากที่แนะนำมา ถ้าต้องเลือกแค่แห่งเดียว ที่ไหนเหมาะที่สุด";
const answer = `หากต้องเลือกเพียงแห่งเดียวระหว่าง ${khun.name} และ ${luang.name} แนะนำ ${khun.name} ครับ\n\nในขณะที่ ${luang.name} เหมาะกับการเดินป่ามากกว่า`;
const options = { toolCallId: "test-call", messages: [], context: {} };

describe("assistant recommendation decision", () => {
  it("records one recommendation despite discussing two parks and accepts 'อันนี้'", async () => {
    const state = makeState();
    reconcileRecommendedPark(state, request, answer);
    expect(state.recommendedPark?.slug).toBe("khun-chae");
    expect(state.selectedPark).toBeUndefined();
    const tool = createAssistantV2Tools(createAssistantV2TurnContext(state, "งั้นเอาอันนี้แหละ")).selectPark;
    const result = await tool.execute!({ position: 2, parkName: luang.name }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "khun-chae" } });
    expect(state.selectedPark?.slug).toBe("khun-chae");
  });

  it("rejects a stale recommendation after searching another province", async () => {
    const state = makeState();
    reconcileRecommendedPark(state, request, answer);
    expect(state.recommendedPark?.slug).toBe("khun-chae");

    const search = createAssistantV2Tools(createAssistantV2TurnContext(state,
      "หาอุทยานในจังหวัดตาก")).searchParks;
    await search.execute!({ province: "ตาก", operation: "LIST" }, options);

    expect(state.recommendedPark).toBeUndefined();
    const selection = await createAssistantV2Tools(createAssistantV2TurnContext(state,
      "งั้นเอาอันนี้แหละ")).selectPark.execute!({}, options);
    expect(selection).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });

  it("does not use a recommendation absent from current results", async () => {
    const state = makeState();
    state.recommendedPark = { ...khun };
    state.currentResults = [getParkCatalog().find((park) => park.slug === "mae-moei")!];
    const selected = await createAssistantV2Tools(createAssistantV2TurnContext(state,
      "งั้นเอาอันนี้แหละ")).selectPark.execute!({}, options);
    expect(selected).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });

  it("does not reinterpret a factual single-park answer as a recommendation", async () => {
    const state = makeState();
    state.recentMessages = [{ role: "assistant", content:
      `สำหรับ ${khun.name} มีจุดชมวิวและทางเดินธรรมชาติครับ` }];
    const selection = await createAssistantV2Tools(createAssistantV2TurnContext(state,
      "เอาที่แนะนำเมื่อกี้แหละ")).selectPark.execute!({}, options);
    expect(selection).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });

  it("does not record a recommendation from a two-choice list or ambiguous answer", async () => {
    const state = makeState();
    reconcileRecommendedPark(state, request, `1. ${khun.name}\n2. ${luang.name}\nเลือกได้ทั้งสองแห่ง`);
    expect(state.recommendedPark).toBeUndefined();
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(state, "งั้นเอาอันนี้แหละ"))
      .selectPark.execute!({ position: 1 }, options);
    expect(result).toMatchObject({ selected: false });
    expect(state.selectedPark).toBeUndefined();
  });
});
