import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH, POST } from "@/app/api/v2/assistant/trip-draft/route";

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
const trip = vi.hoisted(() => ({ getTripDetailForCurrentUser: vi.fn(async () => ({ id: "trip-1" })) }));
vi.mock("@/lib/chat-v2/state/conversation-state", () => ({ assistantV2ConversationStore: store, AssistantV2ConversationExpiredError: class extends Error {} }));
vi.mock("@/lib/auth/current-user", () => ({ ...auth, AuthenticationError: class extends Error {} }));
vi.mock("@/lib/services/ai-trip-service", () => ({ ...service, InvalidAiTripDraftError: class extends Error {} }));
vi.mock("@/lib/services/trip-service", () => trip);

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

  it("applies validated edits and rejects a stale edit", async () => {
    const body = { conversationId, draftId, revision: 1, edit: { operation: "SET_DURATION", durationDays: 2 } };
    expect((await PATCH(request("PATCH", body))).status).toBe(200);
    expect((await PATCH(request("PATCH", body))).status).toBe(409);
  });

  it("requires explicit discard and does not delete saved trips", async () => {
    expect((await DELETE(request("DELETE", { conversationId, draftId, revision: 1 }))).status).toBe(422);
    expect((await DELETE(request("DELETE", { conversationId, draftId, revision: 1, confirmed: true }))).status).toBe(200);
    expect(state.draftTrip).toBeUndefined();
  });
});
