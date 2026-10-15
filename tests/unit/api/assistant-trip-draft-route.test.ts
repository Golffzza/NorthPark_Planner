import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH, POST } from "@/app/api/v2/assistant/trip-draft/route";
import { POST as evaluateTrip } from "@/app/api/v1/trips/[id]/evaluate/route";
import { readAssistantTripDraft, submitAssistantDraftMutation } from "@/components/assistant/trip-draft-requests";
import { createConversationAwareAssistantV2Tools } from "@/lib/chat-v2/tools/conversation-tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import type { TripDetailDto, TripListDto } from "@/lib/mappers/trip-dto";

const state = vi.hoisted(() => ({
  draftTrip: {
    draftId: "f79563b2-c0ce-434f-8c18-c363d9fb805b",
    revision: 1,
    park: { id: "park-1", slug: "park-1", name: "Park" },
    durationDays: 1, companions: [], activities: [],
    verifiedActivities: [{ name: "Waterfall", sourceReference: "doc:chunk" }],
    days: [{ day: 1, title: "Day 1", items: ["Waterfall"] }],
  } as Record<string, unknown> | undefined,
}));
const store = vi.hoisted(() => ({ runTurn: vi.fn(async (_id: string, _owner: string, operation: (s: typeof state) => Promise<unknown>) => operation(state)) }));
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn(async () => ({ id: "user-1" })) }));
const service = vi.hoisted(() => ({ saveAiTripDraft: vi.fn(async () => ({ id: "trip-1" })) }));
const trip = vi.hoisted(() => ({
  getTripDetailForCurrentUser: vi.fn(async (): Promise<TripDetailDto> => ({ id: "trip-1" }) as TripDetailDto),
  listTripsForCurrentUser: vi.fn(async (): Promise<TripListDto[]> => []),
}));
const evaluation = vi.hoisted(() => ({ evaluateTripForCurrentUser: vi.fn() }));
vi.mock("@/lib/chat-v2/state/conversation-state", () => ({ assistantV2ConversationStore: store, AssistantV2ConversationExpiredError: class extends Error {} }));
vi.mock("@/lib/auth/current-user", () => ({ ...auth, AuthenticationError: class extends Error {} }));
vi.mock("@/lib/services/ai-trip-service", () => ({ ...service, InvalidAiTripDraftError: class extends Error {} }));
vi.mock("@/lib/services/trip-service", async () => ({
  ...(await vi.importActual<typeof import("@/lib/services/trip-service")>("@/lib/services/trip-service")),
  ...trip,
}));
vi.mock("@/lib/services/evaluation-service", () => evaluation);

const conversationId = "a644c603-6016-40fc-9d3f-b60800ae2f2c";
const draftId = "f79563b2-c0ce-434f-8c18-c363d9fb805b";
const request = (method: string, data: unknown) => new Request("http://localhost/api/v2/assistant/trip-draft", { method, body: JSON.stringify(data) });

describe("assistant trip draft API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.draftTrip = { draftId, revision: 1, park: { id: "park-1", slug: "park-1", name: "Park" }, durationDays: 1, companions: [], activities: [], verifiedActivities: [{ name: "Waterfall", sourceReference: "doc:chunk" }], days: [{ day: 1, title: "Day 1", items: ["Waterfall"] }] };
  });

  it("returns only the owned conversation draft", async () => {
    const response = await GET(new Request(`http://localhost/api/v2/assistant/trip-draft?conversationId=${conversationId}`));
    expect(response.status).toBe(200);
    expect(store.runTurn).toHaveBeenCalledWith(conversationId, "user-1", expect.any(Function));
    expect((await response.json()).data.draftId).toBe(draftId);
  });

  it("maps an ownership or expiry error across server module boundaries to 404", async () => {
    const failure = new Error("Conversation expired or is unavailable");
    failure.name = "AssistantV2ConversationExpiredError";
    store.runTurn.mockRejectedValueOnce(failure);
    const response = await GET(new Request(`http://localhost/api/v2/assistant/trip-draft?conversationId=${conversationId}`));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("conversation_expired");
  });

  it("requires an explicit confirmation and a current revision", async () => {
    const unconfirmed = await POST(request("POST", { conversationId, draftId, revision: 1, confirmed: false, travelDetails: {} }));
    expect(unconfirmed.status).toBe(422);
    const stale = await POST(request("POST", { conversationId, draftId, revision: 2, confirmed: true, travelDetails: {} }));
    expect(stale.status).toBe(409);
    expect(service.saveAiTripDraft).not.toHaveBeenCalled();
  });

  it("saves once and returns the existing trip on a retry", async () => {
    const body = { conversationId, draftId, revision: 1, confirmed: true, travelDetails: {} };
    expect((await POST(request("POST", body))).status).toBe(201);
    expect((await POST(request("POST", body))).status).toBe(200);
    expect(service.saveAiTripDraft).toHaveBeenCalledTimes(1);
    expect(trip.getTripDetailForCurrentUser).toHaveBeenCalledWith("trip-1");
  });

  it("passes a saved trip's evaluation score through HTTP and the read-only AI tool", async () => {
    const saved = await POST(request("POST", {
      conversationId, draftId, revision: 1, confirmed: true, travelDetails: {},
    }));
    expect(saved.status).toBe(201);
    expect(state.draftTrip).toMatchObject({ savedTripId: "trip-1" });

    const recorded = {
      id: "evaluation-1", totalScore: 83, level: "EXCELLENT", canProceed: true,
      weatherScore: 80, durationScore: 90, timeScore: 75, userProfileScore: 88,
      summary: "saved summary", recommendation: "saved advice",
      evaluatedAt: "2026-10-16T00:00:00.000Z",
    };
    evaluation.evaluateTripForCurrentUser.mockResolvedValue({ tripId: "trip-1", data: recorded });
    const evaluated = await evaluateTrip(new Request("http://localhost/api/v1/trips/trip-1/evaluate", { method: "POST" }), {
      params: Promise.resolve({ id: "trip-1" }),
    });
    expect(evaluated.status).toBe(200);
    expect((await evaluated.json()).data.evaluation.totalScore).toBe(83);

    trip.listTripsForCurrentUser.mockResolvedValue([{ id: "trip-1", status: "EVALUATED", park: { nameTh: "Park" }, latestEvaluation: recorded } as unknown as TripListDto]);
    trip.getTripDetailForCurrentUser.mockResolvedValue({
      id: "trip-1", status: "EVALUATED", park: { nameTh: "Park" }, evaluations: [recorded],
    } as TripDetailDto);
    const chatState = Object.assign(state, {
      id: conversationId, ownerId: "user-1", userConstraints: {}, currentResults: [],
      lastComparedParks: [], recentMessages: [], createdAt: 0, updatedAt: 0, expiresAt: 1000,
    }) as AssistantV2ConversationState;
    const read = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(chatState, "ขอดูคะแนน trip-1"),
    ).getTripEvaluation.execute!({ tripId: "trip-1" }, { toolCallId: "read-evaluation", messages: [], context: {} });
    expect(read).toMatchObject({
      status: "SAVED_EVALUATION", tripId: "trip-1",
      evaluation: { totalScore: 83, weatherScore: 80, durationScore: 90, timeScore: 75, transportAccessibilityScore: 88 },
    });
    expect(evaluation.evaluateTripForCurrentUser).toHaveBeenCalledTimes(1);
    expect(service.saveAiTripDraft).toHaveBeenCalledTimes(1);
  });

  it("applies validated edits and rejects a stale edit", async () => {
    const body = { conversationId, draftId, revision: 1, edit: { operation: "SET_DURATION", durationDays: 2 } };
    expect((await PATCH(request("PATCH", body))).status).toBe(200);
    expect((await PATCH(request("PATCH", body))).status).toBe(409);
  });

  it("passes the UI-edited current revision through GET to the next chat turn", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      return init?.method === "PATCH"
        ? PATCH(new Request(url, init))
        : GET(new Request(url));
    }) as typeof fetch;
    const edit = await submitAssistantDraftMutation("PATCH", {
      conversationId, draftId, revision: 1,
      edit: { operation: "SET_DURATION", durationDays: 2 },
    }, fetcher);
    expect(edit).toMatchObject({ status: "OK", data: { revision: 2, durationDays: 2 } });
    const latest = await readAssistantTripDraft(conversationId, undefined, fetcher);
    expect(latest).toMatchObject({ revision: 2, durationDays: 2 });
    const chatState = {
      id: conversationId, ownerId: "user-1", userConstraints: {}, currentResults: [],
      lastComparedParks: [], recentMessages: [], draftTrip: latest,
      createdAt: 0, updatedAt: 0, expiresAt: 1000,
    } as AssistantV2ConversationState;
    const reviewed = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(chatState, "ขอดูแผนล่าสุด"),
    ).reviewTripDraft.execute!({}, { toolCallId: "review", messages: [], context: {} });
    expect(reviewed).toMatchObject({ status: "OK", draftTrip: { revision: 2, durationDays: 2 } });
  });

  it("refreshes a stale UI revision after a Chat edit and continues from the latest draft", async () => {
    const chatState = Object.assign(state, {
      id: conversationId, ownerId: "user-1", userConstraints: {}, currentResults: [],
      lastComparedParks: [], recentMessages: [], createdAt: 0, updatedAt: 0, expiresAt: 1000,
    }) as AssistantV2ConversationState;
    const chatEdit = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(chatState, "เพิ่มเป็นสองวัน"),
    ).updateTripDraft.execute!({ operation: "SET_DURATION", durationDays: 2 }, { toolCallId: "chat-edit", messages: [], context: {} });
    expect(chatEdit).toMatchObject({ status: "OK", draft: { revision: 2, durationDays: 2 } });

    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      return init?.method === "PATCH"
        ? PATCH(new Request(url, init))
        : GET(new Request(url));
    }) as typeof fetch;
    const stale = await submitAssistantDraftMutation("PATCH", {
      conversationId, draftId, revision: 1,
      edit: { operation: "SET_DURATION", durationDays: 3 },
    }, fetcher);
    expect(stale).toMatchObject({ status: "CONFLICT", draft: { revision: 2, durationDays: 2 } });
    expect(state.draftTrip).toMatchObject({ revision: 2, durationDays: 2 });

    const current = await submitAssistantDraftMutation("PATCH", {
      conversationId, draftId, revision: 2,
      edit: { operation: "SET_DURATION", durationDays: 3 },
    }, fetcher);
    expect(current).toMatchObject({ status: "OK", data: { revision: 3, durationDays: 3 } });
    expect(state.draftTrip).toMatchObject({ revision: 3, durationDays: 3 });
  });

  it("requires explicit discard and does not delete saved trips", async () => {
    expect((await DELETE(request("DELETE", { conversationId, draftId, revision: 1 }))).status).toBe(422);
    expect((await DELETE(request("DELETE", { conversationId, draftId, revision: 1, confirmed: true }))).status).toBe(200);
    expect(state.draftTrip).toBeUndefined();
  });
});
