import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { executeGetParkWeather } from "@/lib/chat-v2/tools/get-park-weather";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import { OpenMeteoForecastNotAvailableYetError } from "@/lib/integrations/open-meteo/open-meteo-service";
import { getParkCatalog } from "@/lib/chat/core/park-catalog";

const mocks = vi.hoisted(() => ({ readPark: vi.fn(), fetchForecast: vi.fn() }));
const nearbySearch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/park-service", async () => ({
  ...await vi.importActual<typeof import("@/lib/services/park-service")>("@/lib/services/park-service"),
  getParkDetail: mocks.readPark,
}));
vi.mock("@/lib/integrations/open-meteo/open-meteo-service", async () => ({
  ...await vi.importActual<typeof import("@/lib/integrations/open-meteo/open-meteo-service")>("@/lib/integrations/open-meteo/open-meteo-service"),
  fetchOpenMeteoWeatherSnapshot: mocks.fetchForecast,
}));
vi.mock("@/lib/services/nearby-places-service", async () => ({
  ...await vi.importActual<typeof import("@/lib/services/nearby-places-service")>("@/lib/services/nearby-places-service"),
  searchNearbyPlacesForPark: nearbySearch,
}));

const options = { toolCallId: "weather", messages: [], context: {} };
const park = {
  id: "db-lan-sang", slug: "lan-sang", nameTh: "อุทยานแห่งชาติลานสาง",
  latitude: 16.881, longitude: 99.14,
};
const forecast = {
  source: "OPEN_METEO", timezone: "Asia/Bangkok",
  forecastAt: new Date("2026-06-11T17:00:00.000Z"),
  weatherCode: 63, weatherCondition: "LIGHT_RAIN",
  precipitationMm: 4.5, temperatureC: 27.4, windSpeedKmh: 18.2,
};

function makeState(): AssistantV2ConversationState {
  return {
    id: "c1", ownerId: "u1", userConstraints: {}, currentResults: [],
    selectedPark: { id: "lan-sang", slug: "lan-sang", name: park.nameTh },
    lastComparedParks: [], recentMessages: [],
    createdAt: 0, updatedAt: 0, expiresAt: 1000,
  };
}

function toolFor(message: string, state = makeState()) {
  return createAssistantV2Tools(createAssistantV2TurnContext(state, message)).getParkWeather;
}

describe("getParkWeather tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00.000Z"));
    mocks.readPark.mockResolvedValue(park);
    mocks.fetchForecast.mockResolvedValue(forecast);
    nearbySearch.mockResolvedValue({ status: "EMPTY", places: [],
      meta: { categories: ["accommodation"], radiusMeters: 3000, source: "GEOAPIFY_PLACES" } });
  });

  afterEach(() => vi.useRealTimers());

  it("registers and reads a dated forecast for the selected park without mutating state", async () => {
    const state = makeState();
    const before = structuredClone(state);
    const tools = createAssistantV2Tools(createAssistantV2TurnContext(state, "พรุ่งนี้ลานสางอากาศเป็นอย่างไร"));
    expect(Object.keys(tools)).toContain("getParkWeather");
    const result = await tools.getParkWeather.execute!({}, options);
    expect(result).toMatchObject({
      status: "OK", park: { slug: "lan-sang" }, dataKind: "DAILY_FORECAST",
      isCurrentObservation: false, forecastDate: "2026-06-11",
      source: "OPEN_METEO", providerIssuedAt: null,
      coordinateVerification: "PASSED_INTERNAL_SCREENING",
      precipitationSumMm: 4.5, temperatureMaxC: 27.4, windSpeedMaxKmh: 18.2,
    });
    expect(mocks.fetchForecast).toHaveBeenCalledWith(expect.objectContaining({
      latitude: park.latitude, longitude: park.longitude, timezone: "Asia/Bangkok",
      signal: expect.any(AbortSignal),
    }));
    expect(state.selectedPark).toEqual(before.selectedPark);
    expect(state.draftTrip).toEqual(before.draftTrip);
    expect(state.informationParks?.[0].slug).toBe("lan-sang");
  });

  it("uses an explicitly named park instead of the previous Selected Park", async () => {
    mocks.readPark.mockResolvedValueOnce({ ...park, id: "db-doi", slug: "doi-inthanon", nameTh: "อุทยานแห่งชาติดอยอินทนนท์" });
    const state = makeState();
    const before = structuredClone(state);
    const result = await toolFor("ดอยอินทนนท์พรุ่งนี้ฝนตกไหม", state).execute!({}, options);
    expect(result).toMatchObject({ status: "OK", park: { slug: "doi-inthanon" } });
    expect(mocks.readPark).toHaveBeenCalledWith("doi-inthanon");
    expect(state.selectedPark).toEqual(before.selectedPark);
    expect(state.draftTrip).toEqual(before.draftTrip);
    expect(state.informationParks?.[0].slug).toBe("doi-inthanon");
  });

  it("uses the last discussed park for a weather follow-up while preserving the draft", async () => {
    mocks.readPark.mockResolvedValueOnce({ ...park, id: "db-doi", slug: "doi-inthanon", nameTh: "อุทยานแห่งชาติดอยอินทนนท์" });
    const state = makeState();
    state.informationParks = [{ id: "doi-inthanon", slug: "doi-inthanon", name: "อุทยานแห่งชาติดอยอินทนนท์" }];
    state.draftTrip = { park: state.selectedPark!, durationDays: 1, companions: [], activities: [], days: [] };
    const before = structuredClone(state.draftTrip);
    expect(await toolFor("ที่นั่นพรุ่งนี้ฝนตกไหม", state).execute!({}, options))
      .toMatchObject({ status: "OK", park: { slug: "doi-inthanon" } });
    expect(state.selectedPark?.slug).toBe("lan-sang");
    expect(state.draftTrip).toEqual(before);
  });

  it("uses the active selected park despite a previously displayed pair", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((item) => item.slug === "doi-luang")!;
    const khun = getParkCatalog().find((item) => item.slug === "khun-chae")!;
    state.selectedPark = doi;
    state.activePark = doi;
    state.informationParks = [doi, khun];
    state.currentResults = [doi, khun];
    state.draftTrip = { park: doi, durationDays: 1, companions: [], activities: [], days: [] };
    const draft = structuredClone(state.draftTrip);
    mocks.readPark.mockResolvedValueOnce({ ...park, slug: "doi-luang", nameTh: doi.name });
    expect(await toolFor("แล้วอากาศที่นั่นเป็นไงบ้าง", state).execute!({}, options))
      .toMatchObject({ status: "OK", park: { slug: "doi-luang" } });
    expect(state.selectedPark).toMatchObject({ slug: "doi-luang" });
    expect(state.activePark?.slug).toBe("doi-luang");
    expect(state.draftTrip).toEqual(draft);
  });

  it("keeps a weather clarification pending and treats a short park name as information only", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((item) => item.slug === "doi-luang")!;
    const khun = getParkCatalog().find((item) => item.slug === "khun-chae")!;
    state.selectedPark = doi;
    state.informationParks = [doi, khun];
    state.activePark = undefined;
    const ambiguous = await toolFor("ดอยหลวงกับขุนแจ พรุ่งนี้ที่ไหนอากาศเป็นไง", state).execute!({}, options);
    expect(ambiguous).toMatchObject({ status: "AMBIGUOUS_PARK" });
    expect(state.pendingClarification).toMatchObject({ intent: "WEATHER" });
    expect(await createAssistantV2Tools(createAssistantV2TurnContext(state, "ขุนแจ"))
      .selectPark.execute!({ parkName: "ขุนแจ" }, options))
      .toMatchObject({ selected: false });
    mocks.readPark.mockResolvedValueOnce({ ...park, slug: "khun-chae", nameTh: khun.name });
    const answer = await toolFor("ขุนแจ", state).execute!({}, options);
    expect(answer).toMatchObject({ status: "OK", park: { slug: "khun-chae" }, forecastDate: "2026-06-11" });
    expect(state.selectedPark).toMatchObject({ slug: "doi-luang" });
    expect(state.activePark).toMatchObject({ slug: "khun-chae" });
    expect(state.pendingClarification).toBeUndefined();
    expect(await createAssistantV2Tools(createAssistantV2TurnContext(state, "ที่พักล่ะ"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options))
      .toMatchObject({ status: "EMPTY", searchedPark: { slug: "khun-chae" } });
  });

  it("uses the selected park for Nearby, then follows explicitly discussed weather park", async () => {
    const state = makeState();
    const doi = getParkCatalog().find((item) => item.slug === "doi-luang")!;
    const khun = getParkCatalog().find((item) => item.slug === "khun-chae")!;
    state.selectedPark = doi;
    state.activePark = doi;
    state.informationParks = [doi, khun];
    state.currentResults = [doi, khun];
    state.draftTrip = { park: doi, durationDays: 1, companions: [], activities: [], days: [] };
    const draft = structuredClone(state.draftTrip);
    const tools = (message: string) => createAssistantV2Tools(createAssistantV2TurnContext(state, message));
    expect(await tools("มีที่พักใกล้ ๆ ไหม").findNearbyPlaces.execute!(
      { categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options))
      .toMatchObject({ status: "EMPTY", searchedPark: { slug: "doi-luang" } });
    expect(nearbySearch).toHaveBeenLastCalledWith("doi-luang", expect.anything(), {}, undefined);
    mocks.readPark.mockResolvedValueOnce({ ...park, slug: "khun-chae", nameTh: khun.name });
    expect(await tools("ขุนแจพรุ่งนี้อากาศเป็นไง").getParkWeather.execute!({}, options))
      .toMatchObject({ status: "OK", park: { slug: "khun-chae" } });
    expect(await tools("ที่พักแถวนั้นล่ะ").findNearbyPlaces.execute!(
      { categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options))
      .toMatchObject({ status: "EMPTY", searchedPark: { slug: "khun-chae" } });
    expect(nearbySearch).toHaveBeenLastCalledWith("khun-chae", expect.anything(), {}, undefined);
    expect(state.selectedPark?.slug).toBe("doi-luang");
    expect(state.activePark?.slug).toBe("khun-chae");
    expect(state.draftTrip).toEqual(draft);
  });

  it("asks only for a missing park or a date that the user left unclear", async () => {
    const state = makeState();
    state.selectedPark = undefined;
    expect(await toolFor("พรุ่งนี้อากาศเป็นอย่างไร", state).execute!({}, options))
      .toEqual({ status: "PARK_REQUIRED" });
    expect(mocks.readPark).not.toHaveBeenCalled();

    expect(await toolFor("ลานสางวันเสาร์อากาศเป็นอย่างไร").execute!({}, options))
      .toEqual({ status: "DATE_REQUIRED" });
    expect(mocks.fetchForecast).not.toHaveBeenCalled();
  });

  it("rejects invalid and past dates without a provider call", async () => {
    expect(await toolFor("ลานสางวันที่ 2026-02-30").execute!({ forecastDate: "2026-02-30" }, options))
      .toEqual({ status: "INVALID_DATE" });
    expect(await toolFor("ลานสางวันที่ 2026-06-09").execute!({ forecastDate: "2026-06-09" }, options))
      .toEqual({ status: "PAST_DATE_UNAVAILABLE", requestedDate: "2026-06-09" });
    expect(mocks.readPark).not.toHaveBeenCalled();
    expect(mocks.fetchForecast).not.toHaveBeenCalled();
  });

  it("blocks coordinates under review or outside valid ranges", async () => {
    mocks.readPark.mockResolvedValueOnce({ ...park, slug: "nanthaburi" });
    expect(await toolFor("นันทบุรีวันนี้อากาศเป็นอย่างไร").execute!({}, options))
      .toMatchObject({ status: "COORDINATE_REVIEW_REQUIRED" });
    mocks.readPark.mockResolvedValueOnce({ ...park, latitude: 999 });
    expect(await toolFor("ลานสางวันนี้อากาศเป็นอย่างไร").execute!({}, options))
      .toMatchObject({ status: "INVALID_COORDINATES" });
    expect(mocks.fetchForecast).not.toHaveBeenCalled();
  });

  it("reports unsupported forecast dates and never fabricates a fallback", async () => {
    mocks.fetchForecast.mockRejectedValueOnce(
      new OpenMeteoForecastNotAvailableYetError("2026-07-10", "2026-06-25"),
    );
    const result = await toolFor("ลานสางวันที่ 2026-07-10").execute!({ forecastDate: "2026-07-10" }, options);
    expect(result).toEqual({
      status: "OUTSIDE_FORECAST_WINDOW", requestedDate: "2026-07-10", lastSupportedDate: "2026-06-25",
    });
    expect(result).not.toHaveProperty("weatherCondition");
  });

  it("keeps current conditions and historical snapshots separate from the daily forecast", async () => {
    const current = await toolFor("ลานสางตอนนี้อากาศเป็นอย่างไร").execute!({}, options);
    expect(current).toMatchObject({
      status: "OK", requestedKind: "CURRENT_CONDITIONS",
      dataKind: "DAILY_FORECAST", isCurrentObservation: false,
    });
    const historical = await toolFor("ทริปที่ไปลานสางครั้งก่อนอากาศเป็นอย่างไร").execute!({}, options);
    expect(historical).toEqual({ status: "HISTORICAL_SNAPSHOT_UNAVAILABLE" });
    const noPark = makeState();
    noPark.selectedPark = undefined;
    expect(await toolFor("ทริปครั้งก่อนอากาศเป็นอย่างไร", noPark).execute!({}, options))
      .toEqual({ status: "HISTORICAL_SNAPSHOT_UNAVAILABLE" });
    expect(mocks.fetchForecast).toHaveBeenCalledTimes(1);
  });

  it("reports provider failure or bounded timeout without fabricated weather", async () => {
    mocks.fetchForecast.mockRejectedValueOnce(new Error("Open-Meteo unavailable"));
    const unavailable = await toolFor("ลานสางวันนี้อากาศเป็นอย่างไร").execute!({}, options);
    expect(unavailable).toEqual({ status: "UPSTREAM_UNAVAILABLE" });

    vi.useRealTimers();
    mocks.fetchForecast.mockImplementationOnce(({ signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true })),
    );
    const timedOut = await executeGetParkWeather("lan-sang", {}, "วันนี้", undefined, {
      readPark: mocks.readPark,
      fetchForecast: mocks.fetchForecast,
      timeoutMs: 5,
    });
    expect(timedOut).toEqual({ status: "UPSTREAM_TIMEOUT" });
    expect(timedOut).not.toHaveProperty("weatherCondition");
  });
});
