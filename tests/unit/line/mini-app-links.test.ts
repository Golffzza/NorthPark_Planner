import { describe, expect, it } from "vitest";

import {
  MINI_APP_ENTRY_POINTS,
  buildMiniAppEntryPath,
  buildMiniAppEntryUrl,
  buildTripsEntryPath,
  listMiniAppEntryPoints,
  normalizeTripEntryTab,
} from "@/lib/line/mini-app-links";

describe("mini-app-links", () => {
  it("defines the expected LINE MINI App entry points", () => {
    expect(MINI_APP_ENTRY_POINTS.exploreParks.path).toBe("/parks");
    expect(MINI_APP_ENTRY_POINTS.planTrip.path).toBe("/trips/new");
    expect(MINI_APP_ENTRY_POINTS.myTrips.path).toBe("/trips");
    expect(MINI_APP_ENTRY_POINTS.alerts.path).toBe("/trips?tab=alerts");
  });

  it("builds entry paths from the shared source of truth", () => {
    expect(buildMiniAppEntryPath("exploreParks")).toBe("/parks");
    expect(buildMiniAppEntryPath("planTrip")).toBe("/trips/new");
    expect(buildTripsEntryPath("overview")).toBe("/trips");
    expect(buildTripsEntryPath("alerts")).toBe("/trips?tab=alerts");
  });

  it("normalizes unknown trip tabs back to the safe overview fallback", () => {
    expect(normalizeTripEntryTab("alerts")).toBe("alerts");
    expect(normalizeTripEntryTab("unknown")).toBe("overview");
    expect(normalizeTripEntryTab(undefined)).toBe("overview");
  });

  it("can build absolute entry URLs without calling external services", () => {
    expect(buildMiniAppEntryUrl("https://northpark.example", "alerts")).toBe(
      "https://northpark.example/trips?tab=alerts",
    );
    expect(listMiniAppEntryPoints()).toHaveLength(4);
  });
});
