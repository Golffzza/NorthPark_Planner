import { beforeEach, describe, expect, it, vi } from "vitest";

import { searchOriginPlaces } from "@/lib/services/origin-geocoding-service";

describe("origin geocoding", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns only provider coordinates and does not select a result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
      { place_id: 12, display_name: "สถานีขนส่งพิษณุโลก", lat: "16.82", lon: "100.26" },
      { place_id: 13, display_name: "พิษณุโลก", lat: "16.81", lon: "100.25" },
      { place_id: 14, display_name: "bad", lat: "unknown", lon: "100" },
    ]), { status: 200 }));
    const results = await searchOriginPlaces("สถานีขนส่งพิษณุโลก");
    expect(results).toEqual([
      { id: "12", name: "สถานีขนส่งพิษณุโลก", lat: 16.82, lng: 100.26 },
      { id: "13", name: "พิษณุโลก", lat: 16.81, lng: 100.25 },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("countrycodes")).toBe("th");
    expect(url.searchParams.get("limit")).toBe("5");
  });

  it("rejects a short query without provider access", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(searchOriginPlaces("ก")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
