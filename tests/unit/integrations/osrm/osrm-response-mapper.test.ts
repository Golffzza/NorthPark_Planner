import { describe, expect, it } from "vitest";

import {
  OsrmResponseMapperError,
  mapOsrmRouteSnapshot,
} from "@/lib/integrations/osrm/osrm-response-mapper";

describe("mapOsrmRouteSnapshot", () => {
  it("normalizes the first OSRM route into distance and duration fields", () => {
    const snapshot = mapOsrmRouteSnapshot({
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
    });

    expect(snapshot).toMatchObject({
      source: "OSRM",
      distanceMeters: 128734.5,
      durationSeconds: 8021.4,
      geometryJson: {
        type: "LineString",
      },
    });
  });

  it("rejects malformed upstream responses without a route", () => {
    expect(() =>
      mapOsrmRouteSnapshot({
        code: "NoRoute",
        routes: [],
      }),
    ).toThrow(OsrmResponseMapperError);
  });
});
