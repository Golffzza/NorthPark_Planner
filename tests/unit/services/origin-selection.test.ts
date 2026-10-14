import { describe, expect, it } from "vitest";
import { gpsErrorMessage, gpsOrigin, manualOrigin, requestGpsOrigin, searchedOrigin } from "@/lib/services/origin-selection";

describe("optional origin selection", () => {
  it("keeps selected geocoding coordinates and clears them when the user edits the name", () => {
    const chosen = searchedOrigin({ id: "23", name: "มหาวิทยาลัยนเรศวร", lat: 16.747, lng: 100.192 });
    expect(chosen).toMatchObject({ source: "search", lat: 16.747, lng: 100.192 });
    expect(manualOrigin(chosen.text + " ประตู 1")).toMatchObject({ source: "manual", lat: null, lng: null });
  });

  it("reports GPS permission, timeout and unavailable states without inventing coordinates", () => {
    expect(gpsErrorMessage(1)).toContain("ไม่ได้รับอนุญาต");
    expect(gpsErrorMessage(3)).toContain("หมดเวลา");
    expect(gpsErrorMessage(2)).toContain("ไม่สามารถระบุตำแหน่ง");
    expect(() => gpsOrigin(Number.NaN, 100)).toThrow();
  });

  it("does not choose a GPS origin when browser permission is denied", async () => {
    const provider = { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) };
    await expect(requestGpsOrigin(provider)).rejects.toThrow("ไม่ได้รับอนุญาต");
  });
});
