import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OsrmServiceError, fetchOsrmNearbyTable, fetchOsrmRouteSnapshot } from "@/lib/integrations/osrm/osrm-service";

describe("fetchOsrmRouteSnapshot", () => {
  beforeEach(() => {
    process.env.OSRM_BASE_URL = "http://router.project-osrm.org";
    process.env.USE_PUBLIC_OSRM = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("batches nearby destinations in longitude,latitude order and maps distance and duration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "Ok",
      sources: [{ location: [98.922418, 18.803549], distance: 143 }],
      destinations: [
        { location: [98.91964, 18.803387], distance: 7 },
        { location: [98.93, 18.81], distance: 12 },
      ],
      distances: [[509.9, 2200]], durations: [[97.7, 310]],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const routes = await fetchOsrmNearbyTable(
      { lat: 18.8047, lng: 98.9218 },
      [{ lat: 18.8033254, lng: 98.9196507 }, { lat: 18.81, lng: 98.93 }],
    );
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/table/v1/driving/98.9218,18.8047;98.9196507,18.8033254;98.93,18.81");
    expect(url.searchParams.get("sources")).toBe("0");
    expect(url.searchParams.get("destinations")).toBe("1;2");
    expect(url.searchParams.get("annotations")).toBe("distance,duration");
    expect(fetchMock.mock.calls[0][1].headers["user-agent"]).toContain("NorthPark_Planner/");
    expect(routes).toEqual([
      { status: "OK", distanceMeters: 509.9, durationSeconds: 97.7 },
      { status: "OK", distanceMeters: 2200, durationSeconds: 310 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not return estimates for disconnected, distant, or missing snapped points", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "Ok", sources: [{ location: [98.92, 18.80], distance: 10 }],
      destinations: [
        { location: [98.91, 18.81], distance: 10 },
        { location: [98.93, 18.82], distance: 201 },
        { distance: 20 },
        { location: [98.94, 18.83], distance: 10 },
      ],
      distances: [[null, 500, 600, 700]], durations: [[null, 100, 120, 140]],
      fallback_speed_cells: [[0, 3]],
    }), { status: 200 })));
    const routes = await fetchOsrmNearbyTable(
      { lat: 18.80, lng: 98.92 },
      [{ lat: 18.81, lng: 98.91 }, { lat: 18.82, lng: 98.93 }, { lat: 18.82, lng: 98.935 }, { lat: 18.83, lng: 98.94 }],
    );
    expect(routes).toEqual([
      { status: "NO_ROUTE" }, { status: "UNSUPPORTED" }, { status: "UNAVAILABLE" }, { status: "NO_ROUTE" },
    ]);
  });

  it("rejects far-snapped park coordinates and invalid input without estimates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "Ok", sources: [{ location: [98.92, 18.80], distance: 800 }],
      destinations: [{ location: [98.91, 18.81], distance: 5 }],
      distances: [[500]], durations: [[100]],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchOsrmNearbyTable({ lat: 18.80, lng: 98.92 }, [{ lat: 18.81, lng: 98.91 }]))
      .toEqual([{ status: "UNSUPPORTED" }]);
    await expect(fetchOsrmNearbyTable({ lat: 95, lng: 98.92 }, [{ lat: 18.81, lng: 98.91 }]))
      .rejects.toBeInstanceOf(OsrmServiceError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps NoTable and NoSegment without inventing a route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "NoTable" }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "NoSegment" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const origin = { lat: 18.80, lng: 98.92 };
    const destinations = [{ lat: 18.81, lng: 98.91 }];
    expect(await fetchOsrmNearbyTable(origin, destinations)).toEqual([{ status: "NO_ROUTE" }]);
    expect(await fetchOsrmNearbyTable(origin, destinations)).toEqual([{ status: "UNSUPPORTED" }]);
  });

  it("times out the nearby table request without returning fake route values", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })));
    const pending = fetchOsrmNearbyTable({ lat: 18.80, lng: 98.92 }, [{ lat: 18.81, lng: 98.91 }]);
    const assertion = expect(pending).rejects.toBeInstanceOf(OsrmServiceError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });
});
