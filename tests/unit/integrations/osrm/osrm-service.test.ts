import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OsrmServiceError, fetchOsrmRouteSnapshot } from "@/lib/integrations/osrm/osrm-service";

describe("fetchOsrmRouteSnapshot", () => {
  beforeEach(() => {
    process.env.OSRM_BASE_URL = "http://router.project-osrm.org";
    process.env.USE_PUBLIC_OSRM = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the OSRM route endpoint and normalizes the route summary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 128734.5,
              duration: 8021.4,
              geometry: {
                type: "LineString",
                coordinates: [
                  [98.9871, 18.7993],
                  [98.4871, 18.5883],
                ],
              },
              legs: [],
            },
          ],
          waypoints: [],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await fetchOsrmRouteSnapshot({
      originLat: 18.7993,
      originLng: 98.9871,
      destinationLat: 18.5883,
      destinationLng: 98.4871,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "http://router.project-osrm.org/route/v1/driving/98.9871,18.7993;98.4871,18.5883?",
      ),
      expect.objectContaining({
        headers: {
          accept: "application/json",
        },
      }),
    );
    expect(snapshot).toMatchObject({
      source: "OSRM",
      distanceMeters: 128734.5,
      durationSeconds: 8021.4,
    });
  });

  it("translates upstream failures into a safe OSRM service error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "InvalidQuery" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchOsrmRouteSnapshot({
        originLat: 18.7993,
        originLng: 98.9871,
        destinationLat: 18.5883,
        destinationLng: 98.4871,
      }),
    ).rejects.toBeInstanceOf(OsrmServiceError);
  });
});
