import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TripDetailDto, TripListDto } from "@/lib/mappers/trip-dto";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import { AuthenticationError } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/services/trip-service";

const tripReads = vi.hoisted(() => ({
  listTripsForCurrentUser: vi.fn(),
  getTripDetailForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/trip-service", async () => ({
  ...await vi.importActual<typeof import("@/lib/services/trip-service")>("@/lib/services/trip-service"),
  ...tripReads,
}));

const options = { toolCallId: "evaluation", messages: [], context: {} };
const firstTrip = {
  id: "trip-a",
  tripDate: "2026-10-20T00:00:00.000Z",
  status: "EVALUATED",
  park: { nameTh: "อุทยานแห่งชาติลานสาง" },
  latestEvaluation: { id: "evaluation-a" },
} as TripListDto;
const secondTrip = {
  ...firstTrip,
  id: "trip-b",
  tripDate: null,
  status: "DRAFT",
  park: { nameTh: "อุทยานแห่งชาติดอยอินทนนท์" },
  latestEvaluation: undefined,
} as TripListDto;
const detail = {
  ...firstTrip,
  evaluations: [{
    id: "evaluation-a",
    totalScore: 83,
    level: "EXCELLENT",
    canProceed: true,
    weatherScore: 80,
    durationScore: 90,
    timeScore: 75,
    userProfileScore: 88,
    summary: "ผลที่บันทึกไว้",
    recommendation: "คำแนะนำที่บันทึกไว้",
    evaluatedAt: "2026-10-14T02:00:00.000Z",
  }],
} as TripDetailDto;

function makeState(): AssistantV2ConversationState {
  return {
    id: "conversation-a", ownerId: "user-a", userConstraints: {},
    currentResults: [], lastComparedParks: [], recentMessages: [],
    createdAt: 0, updatedAt: 0, expiresAt: 1000,
  };
}

function toolFor(message: string, state = makeState()) {
  return createAssistantV2Tools(createAssistantV2TurnContext(state, message)).getTripEvaluation;
}

describe("getTripEvaluation tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripReads.listTripsForCurrentUser.mockResolvedValue([firstTrip]);
    tripReads.getTripDetailForCurrentUser.mockResolvedValue(detail);
  });

  it("reads the owner's saved evaluation and maps scores without changing state", async () => {
    const state = makeState();
    const before = structuredClone(state);
    const result = await toolFor("ทริปของฉันได้คะแนนเท่าไร", state).execute!({}, options);

    expect(result).toEqual({
      status: "SAVED_EVALUATION",
      tripId: "trip-a",
      parkName: "อุทยานแห่งชาติลานสาง",
      tripDate: firstTrip.tripDate,
      tripStatus: "EVALUATED",
      evaluation: {
        id: "evaluation-a", totalScore: 83, level: "EXCELLENT", canProceed: true,
        weatherScore: 80, durationScore: 90, timeScore: 75, transportAccessibilityScore: 88,
        summary: "ผลที่บันทึกไว้", recommendation: "คำแนะนำที่บันทึกไว้",
        evaluatedAt: "2026-10-14T02:00:00.000Z",
      },
    });
    expect(tripReads.listTripsForCurrentUser).toHaveBeenCalledOnce();
    expect(tripReads.getTripDetailForCurrentUser).toHaveBeenCalledExactlyOnceWith("trip-a");
    expect(state).toEqual(before);
  });

  it("reports an owned trip without a saved evaluation", async () => {
    tripReads.listTripsForCurrentUser.mockResolvedValue([secondTrip]);
    tripReads.getTripDetailForCurrentUser.mockResolvedValue({ ...secondTrip, evaluations: [] });
    const result = await toolFor("ทริปของฉันประเมินหรือยัง").execute!({}, options);
    expect(result).toMatchObject({ status: "NOT_EVALUATED", tripId: "trip-b", tripStatus: "DRAFT" });
    expect(result).not.toHaveProperty("evaluation");
  });

  it("asks which trip when several are owned, even if a park is selected", async () => {
    tripReads.listTripsForCurrentUser.mockResolvedValue([firstTrip, secondTrip]);
    const state = makeState();
    state.selectedPark = { id: "lan-sang", slug: "lan-sang", name: "อุทยานแห่งชาติลานสาง" };
    const result = await toolFor("ทริปของฉันได้กี่คะแนน", state).execute!({}, options);
    expect(result).toMatchObject({
      status: "TRIP_CLARIFICATION_REQUIRED",
      totalTrips: 2,
      choices: [{ tripId: "trip-a" }, { tripId: "trip-b" }],
    });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });

  it("does not choose between two trip IDs mentioned in one request", async () => {
    tripReads.listTripsForCurrentUser.mockResolvedValue([firstTrip, secondTrip]);
    const result = await toolFor("ผล trip-a กับ trip-b เป็นอย่างไร")
      .execute!({ tripId: "trip-a" }, options);
    expect(result).toMatchObject({ status: "TRIP_CLARIFICATION_REQUIRED" });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });

  it("uses an explicitly named park only when it identifies one owned trip", async () => {
    tripReads.listTripsForCurrentUser.mockResolvedValue([firstTrip, secondTrip]);
    tripReads.getTripDetailForCurrentUser.mockResolvedValueOnce({ ...secondTrip, evaluations: [] });
    const selected = await toolFor("ทริปดอยอินทนนท์ประเมินหรือยัง")
      .execute!({}, options);
    expect(selected).toMatchObject({ status: "NOT_EVALUATED", tripId: "trip-b" });

    tripReads.getTripDetailForCurrentUser.mockClear();
    tripReads.listTripsForCurrentUser.mockResolvedValue([
      firstTrip, { ...firstTrip, id: "trip-c" }, secondTrip,
    ]);
    const ambiguous = await toolFor("ทริปลานสางได้คะแนนเท่าไร")
      .execute!({}, options);
    expect(ambiguous).toMatchObject({ status: "TRIP_CLARIFICATION_REQUIRED" });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });

  it("reads an explicitly named owned trip but rejects a model-invented selection", async () => {
    tripReads.listTripsForCurrentUser.mockResolvedValue([firstTrip, secondTrip]);
    tripReads.getTripDetailForCurrentUser.mockResolvedValueOnce({ ...secondTrip, evaluations: [] });
    const selected = await toolFor("ผลประเมินทริป trip-b เป็นอย่างไร")
      .execute!({ tripId: "trip-b" }, options);
    expect(selected).toMatchObject({ status: "NOT_EVALUATED", tripId: "trip-b" });
    expect(tripReads.getTripDetailForCurrentUser).toHaveBeenCalledWith("trip-b");

    tripReads.getTripDetailForCurrentUser.mockClear();
    const invented = await toolFor("ทริปนั้นได้กี่คะแนน")
      .execute!({ tripId: "trip-a" }, options);
    expect(invented).toMatchObject({ status: "TRIP_CLARIFICATION_REQUIRED" });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });

  it("does not reveal another user's trip or evaluation", async () => {
    const result = await toolFor("ดูผล trip-other")
      .execute!({ tripId: "trip-other" }, options);
    expect(result).toEqual({ status: "TRIP_NOT_FOUND" });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();

    tripReads.getTripDetailForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));
    const second = await toolFor("ดูผล trip-a").execute!({ tripId: "trip-a" }, options);
    expect(second).toEqual({ status: "TRIP_NOT_FOUND" });
  });

  it("requires authentication and handles no trips without evaluating anything", async () => {
    tripReads.listTripsForCurrentUser.mockRejectedValueOnce(new AuthenticationError("Unauthorized"));
    expect(await toolFor("คะแนนทริปของฉัน").execute!({}, options))
      .toEqual({ status: "UNAUTHORIZED" });

    tripReads.listTripsForCurrentUser.mockResolvedValue([]);
    expect(await toolFor("คะแนนทริปของฉัน").execute!({}, options))
      .toEqual({ status: "NO_TRIPS" });
    expect(tripReads.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });
});
