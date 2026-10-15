import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText, streamText } from "ai";

import { chatV2Application } from "@/lib/chat-v2/application/chat-v2-application";
import { assistantV2ConversationStore } from "@/lib/chat-v2/state/conversation-state";
import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";

vi.mock("ai", async () => ({
  ...(await vi.importActual<typeof import("ai")>("ai")),
  generateText: vi.fn(), streamText: vi.fn(),
}));

const park = { id: "park-1", slug: "doi-suthep-pui", name: "ดอยสุเทพ-ปุย" };
const first: NearbyPlace = {
  id: "osm:node:1", osmType: "node", osmId: 1,
  osmUrl: "https://www.openstreetmap.org/node/1", name: "Sansuk cafe",
  category: "food", lat: 18.8, lng: 98.9, straightLineDistanceMeters: 273,
  roadDistanceMeters: 510, estimatedDrivingMinutes: 2,
  routeStatus: "OK", source: "OPENSTREETMAP",
};
const second: NearbyPlace = { ...first, id: "osm:node:2", osmId: 2, name: "ร้านดอย" };
const third: NearbyPlace = { ...first, id: "osm:node:3", osmId: 3, name: "ร้านที่ไม่แสดง" };

function step(output: unknown) {
  return {
    toolCalls: [{ toolName: "findNearbyPlaces", toolCallId: "call-1", input: { categories: ["food"] } }],
    toolResults: [{ toolName: "findNearbyPlaces", toolCallId: "call-1", output }],
  };
}

async function conversation() {
  const id = await assistantV2ConversationStore.runTurn(undefined, crypto.randomUUID(), async (state) => {
    state.selectedPark = park;
    state.draftTrip = { draftId: "draft-1", revision: 4, park, durationDays: 1, companions: [], activities: [], days: [] };
    return { id: state.id, ownerId: state.ownerId };
  });
  return id;
}

describe("Nearby answer reconciliation in both chat modes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps verified park order and active selection after a count-only turn in Send and Streaming", async () => {
    const entries = ["doi-luang", "khun-chae"].map((slug) => {
      const entry = getParkCatalog().find((item) => item.slug === slug)!;
      return { id: entry.id, slug: entry.slug, name: entry.name };
    });
    const makeConversation = async () => {
      const ownerId = crypto.randomUUID();
      const id = await assistantV2ConversationStore.runTurn(undefined, ownerId, async (state) => {
        state.currentResults = entries;
        state.currentResultsOrderVerified = true;
        state.informationParks = entries;
        state.selectedPark = entries[0];
        state.activePark = entries[0];
        return state.id;
      });
      return { id, ownerId };
    };
    const countStep = { toolCalls: [{ toolName: "searchParks", toolCallId: "count-1",
      input: { operation: "COUNT", province: "เชียงราย" } }], toolResults: [] };
    const read = async ({ id, ownerId }: { id: string; ownerId: string }) =>
      assistantV2ConversationStore.runTurn(id, ownerId, async (state) => ({
        slugs: state.currentResults.map((item) => item.slug),
        verified: state.currentResultsOrderVerified,
        selected: state.selectedPark?.slug,
        active: state.activePark?.slug,
      }));

    const sent = await makeConversation();
    vi.mocked(generateText).mockResolvedValueOnce({ text: "มี 2 แห่ง", steps: [countStep] } as never);
    await chatV2Application.send({ conversationId: sent.id, message: "แล้วมันมีทั้งหมดกี่ที่อะ" }, sent.ownerId);
    const streamed = await makeConversation();
    vi.mocked(streamText).mockImplementationOnce(((options: { onFinish: (value: unknown) => void }) => {
      options.onFinish({ text: "มี 2 แห่ง", steps: [countStep], finishReason: "stop" });
      return { text: Promise.resolve("มี 2 แห่ง"), steps: Promise.resolve([countStep]) };
    }) as never);
    await chatV2Application.stream({ conversationId: streamed.id, message: "แล้วมันมีทั้งหมดกี่ที่อะ" }, streamed.ownerId);
    expect(await read(sent)).toEqual(await read(streamed));
    expect(await read(sent)).toEqual({ slugs: ["doi-luang", "khun-chae"],
      verified: true, selected: "doi-luang", active: "doi-luang" });
  });

  it("asks for the park in both modes when Weather rejects an ambiguous reference", async () => {
    const weatherStep = { toolCalls: [{ toolName: "getParkWeather", toolCallId: "weather-1", input: {} }],
      toolResults: [{ toolName: "getParkWeather", toolCallId: "weather-1", output: { status: "AMBIGUOUS_PARK" } }] };
    const stale = "ดอยหลวงอากาศ 20 องศา";
    const sent = await conversation();
    vi.mocked(generateText).mockResolvedValueOnce({ text: stale, steps: [weatherStep] } as never);
    const sendAnswer = await chatV2Application.send({ conversationId: sent.id,
      message: "อากาศที่นั่นเป็นไงบ้าง" }, sent.ownerId);
    const streamed = await conversation();
    vi.mocked(streamText).mockImplementationOnce(((options: { onFinish: (value: unknown) => void }) => {
      options.onFinish({ text: stale, steps: [weatherStep], finishReason: "stop" });
      return { text: Promise.resolve(stale), steps: Promise.resolve([weatherStep]) };
    }) as never);
    await chatV2Application.stream({ conversationId: streamed.id,
      message: "อากาศที่นั่นเป็นไงบ้าง" }, streamed.ownerId);
    const streamAnswer = await assistantV2ConversationStore.runTurn(streamed.id, streamed.ownerId,
      async (state) => state.recentMessages.at(-1)?.content);
    expect(sendAnswer.message).toBe(streamAnswer);
    expect(sendAnswer.message).toContain("บอกชื่ออุทยาน");
    expect(sendAnswer.message).not.toContain("20");
  });

  it("keeps Send and Streaming park context aligned when a list tool runs twice", async () => {
    const candidates = ["doi-inthanon", "doi-suthep-pui"].map((slug) => {
      const entry = getParkCatalog().find((item) => item.slug === slug)!;
      return { id: entry.id, slug: entry.slug, name: entry.name };
    });
    const makeConversation = async () => {
      const ownerId = crypto.randomUUID();
      const id = await assistantV2ConversationStore.runTurn(undefined, ownerId, async (state) => {
        state.currentResults = candidates;
        state.informationParks = candidates;
        state.selectedPark = candidates[0];
        return state.id;
      });
      return { id, ownerId };
    };
    const steps = ["recommendParks", "getParkInfo", "recommendParks"].map((toolName, index) => ({
      toolCalls: [{ toolName, toolCallId: `call-${index}`, input: {} }], toolResults: [],
    }));
    const text = `1. **${candidates[1].name}**`;
    const send = await makeConversation();
    vi.mocked(generateText).mockResolvedValueOnce({ text, steps } as never);
    await chatV2Application.send({ conversationId: send.id, message: "แนะนำอีกครั้ง" }, send.ownerId);
    const sendState = await assistantV2ConversationStore.runTurn(send.id, send.ownerId, async (state) => ({
      subject: state.informationParks?.map((item) => item.slug), selected: state.selectedPark?.slug,
    }));
    const streaming = await makeConversation();
    vi.mocked(streamText).mockImplementationOnce(((options: { onFinish: (value: unknown) => void }) => {
      options.onFinish({ text, steps, finishReason: "stop" });
      return { text: Promise.resolve(text), steps: Promise.resolve(steps) };
    }) as never);
    await chatV2Application.stream({ conversationId: streaming.id, message: "แนะนำอีกครั้ง" }, streaming.ownerId);
    const streamState = await assistantV2ConversationStore.runTurn(streaming.id, streaming.ownerId, async (state) => ({
      subject: state.informationParks?.map((item) => item.slug), selected: state.selectedPark?.slug,
    }));
    expect(sendState).toEqual(streamState);
    expect(sendState).toEqual({ subject: ["doi-suthep-pui"], selected: "doi-inthanon" });
  });

  it("Send persists only displayed places and suppresses a later rejected answer", async () => {
    const { id, ownerId } = await conversation();
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. **ร้านดอย**\n2. **Sansuk cafe**",
      steps: [step({ status: "OK", places: [first, second, third], searchedPark: park, meta: { source: "GEOAPIFY_PLACES" } })],
    } as never);
    await chatV2Application.send({ conversationId: id, message: "มีร้านอาหารใกล้ไหม" }, ownerId);
    const afterList = await assistantV2ConversationStore.runTurn(id, ownerId, async (state) => ({
      names: state.nearbyResults?.places.map((place) => place.name),
      draftRevision: state.draftTrip?.revision, selected: state.selectedPark?.slug,
    }));
    expect(afterList).toEqual({ names: ["ร้านดอย", "Sansuk cafe"], draftRevision: 4, selected: park.slug });

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "ร้านแรกขับรถ 510 เมตร",
      steps: [step({ status: "PLACE_REFERENCE_REQUIRED", places: [] })],
    } as never);
    const answer = await chatV2Application.send({ conversationId: id, message: "ร้านแรกอยู่ไกลแค่ไหน" }, ownerId);
    expect(answer.message).toContain("ขอชื่อ");
    expect(answer.message).not.toContain("510");

    vi.mocked(generateText).mockResolvedValueOnce({
      text: "ร้านที่สองขับรถ 700 เมตร",
      steps: [{ toolCalls: [], toolResults: [] }],
    } as never);
    const withoutTool = await chatV2Application.send({ conversationId: id, message: "ร้านที่สองอยู่ไกลแค่ไหน" }, ownerId);
    expect(withoutTool.message).toContain("ขอชื่อ");
    expect(withoutTool.message).not.toContain("700");
  });

  it("Streaming commits the order in its final answer and keeps the draft intact", async () => {
    const { id, ownerId } = await conversation();
    vi.mocked(streamText).mockImplementationOnce(((options: { onFinish: (value: unknown) => void }) => {
      options.onFinish({ text: "1. **Sansuk cafe**", steps: [step({
        status: "OK", places: [first, second], searchedPark: park, meta: { source: "GEOAPIFY_PLACES" },
      })], finishReason: "stop" });
      return { text: Promise.resolve("1. **Sansuk cafe**"), steps: Promise.resolve([]) };
    }) as never);
    await chatV2Application.stream({ conversationId: id, message: "ร้านอาหารใกล้ ๆ" }, ownerId);
    const after = await assistantV2ConversationStore.runTurn(id, ownerId, async (state) => ({
      names: state.nearbyResults?.places.map((place) => place.name),
      draftRevision: state.draftTrip?.revision, selected: state.selectedPark?.slug,
    }));
    expect(after).toEqual({ names: ["Sansuk cafe"], draftRevision: 4, selected: park.slug });
  });

  it("Send and Streaming persist the same scoped EMPTY answer without a fake route", async () => {
    const output = { status: "EMPTY", places: [], searchedPark: park,
      meta: { source: "GEOAPIFY_PLACES", categories: ["accommodation"], radiusMeters: 3000 } };
    const text = "ที่พักขับรถไป 510 เมตร";
    const emptyStep = step(output);
    const sent = await conversation();
    vi.mocked(generateText).mockResolvedValueOnce({ text, steps: [emptyStep] } as never);
    const sendAnswer = await chatV2Application.send({ conversationId: sent.id, message: "มีที่พักใกล้ๆไหม" }, sent.ownerId);
    const streamed = await conversation();
    vi.mocked(streamText).mockImplementationOnce(((options: { onFinish: (value: unknown) => void }) => {
      options.onFinish({ text, steps: [emptyStep], finishReason: "stop" });
      return { text: Promise.resolve(text), steps: Promise.resolve([emptyStep]) };
    }) as never);
    await chatV2Application.stream({ conversationId: streamed.id, message: "มีที่พักใกล้ๆไหม" }, streamed.ownerId);
    const streamState = await assistantV2ConversationStore.runTurn(streamed.id, streamed.ownerId, async (state) => ({
      message: state.recentMessages.at(-1)?.content,
      selected: state.selectedPark?.slug,
      draftRevision: state.draftTrip?.revision,
    }));
    expect(sendAnswer.message).toContain("ที่พัก");
    expect(sendAnswer.message).toContain("3,000");
    expect(sendAnswer.message).not.toContain("ขับรถ");
    expect(sendAnswer.message).not.toContain("510");
    expect(streamState).toEqual({ message: sendAnswer.message, selected: park.slug, draftRevision: 4 });
  });
});
