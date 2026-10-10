// ./scripts/test-live-snapshot-consistency-real.ts

import assert from "node:assert/strict";

import { prisma } from "../lib/db/prisma";

import {
  assertLiveSnapshotsMatchTrip,
  MissingLiveSnapshotError,
  StaleLiveSnapshotError,
} from "../lib/orchestration/live-snapshot-consistency";

const DEFAULT_TRIP_ID =
  "cmussl1ot0000v8v0v3x11n70";

function printSection(title: string) {
  console.log("");
  console.log("=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

function pass(message: string) {
  console.log(`✅ ${message}`);
}

function fail(message: string) {
  console.error(`❌ ${message}`);
}

function expectStale(
  code:
    | "stale_weather_snapshot"
    | "stale_route_snapshot"
    | "stale_sunset_snapshot",
  fn: () => void,
) {
  try {
    fn();

    assert.fail(
      `Expected StaleLiveSnapshotError with code "${code}", but no error was thrown`,
    );
  } catch (error: unknown) {
    if (!(error instanceof StaleLiveSnapshotError)) {
      throw error;
    }

    const staleError =
      error as StaleLiveSnapshotError;

    assert.equal(
      staleError.code,
      code,
    );
  }
}

function expectMissing(
  code:
    | "missing_weather_snapshot"
    | "missing_route_snapshot"
    | "missing_sunset_snapshot",
  fn: () => void,
) {
  try {
    fn();

    assert.fail(
      `Expected MissingLiveSnapshotError with code "${code}", but no error was thrown`,
    );
  } catch (error: unknown) {
    if (!(error instanceof MissingLiveSnapshotError)) {
      throw error;
    }

    const missingError =
      error as MissingLiveSnapshotError;

    assert.equal(
      missingError.code,
      code,
    );
  }
}

async function main() {
  const tripId =
    process.argv[2] ??
    DEFAULT_TRIP_ID;

  printSection(
    "NorthPark — Real Snapshot Consistency Test",
  );

  console.log(`Trip ID: ${tripId}`);
  console.log(
    "Mode: READ-ONLY database test",
  );

  const trip =
    await prisma.trip.findUnique({
      where: {
        id: tripId,
      },

      include: {
        park: {
          select: {
            id: true,
            nameTh: true,
            latitude: true,
            longitude: true,
            openTime: true,
            closeTime: true,
          },
        },

        weatherSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },

        routeSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },

        sunsetSnapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

  if (!trip) {
    throw new Error(
      `Trip not found: ${tripId}`,
    );
  }

  const weatherSnapshot =
    trip.weatherSnapshots[0] ?? null;

  const routeSnapshot =
    trip.routeSnapshots[0] ?? null;

  const sunsetSnapshot =
    trip.sunsetSnapshots[0] ?? null;

  printSection(
    "REAL DATA LOADED FROM DATABASE",
  );

  console.log({
    trip: {
      id: trip.id,
      tripDate: trip.tripDate,
      departAt: trip.departAt,

      originLat:
        trip.originLat?.toString() ??
        null,

      originLng:
        trip.originLng?.toString() ??
        null,

      transportMode:
        trip.transportMode,

      status:
        trip.status,

      park: {
        id: trip.park.id,
        nameTh:
          trip.park.nameTh,

        latitude:
          trip.park.latitude?.toString() ??
          null,

        longitude:
          trip.park.longitude?.toString() ??
          null,
      },
    },

    weatherSnapshot: weatherSnapshot
      ? {
          id: weatherSnapshot.id,
          forecastAt:
            weatherSnapshot.forecastAt,
          timezone:
            weatherSnapshot.timezone,

          latitude:
            weatherSnapshot.latitude.toString(),

          longitude:
            weatherSnapshot.longitude.toString(),

          condition:
            weatherSnapshot.weatherCondition,

          createdAt:
            weatherSnapshot.createdAt,
        }
      : null,

    routeSnapshot: routeSnapshot
      ? {
          id: routeSnapshot.id,

          originLat:
            routeSnapshot.originLat.toString(),

          originLng:
            routeSnapshot.originLng.toString(),

          destinationLat:
            routeSnapshot.destinationLat.toString(),

          destinationLng:
            routeSnapshot.destinationLng.toString(),

          distanceMeters:
            routeSnapshot.distanceMeters,

          durationSeconds:
            routeSnapshot.durationSeconds,

          createdAt:
            routeSnapshot.createdAt,
        }
      : null,

    sunsetSnapshot: sunsetSnapshot
      ? {
          id: sunsetSnapshot.id,

          sunsetAt:
            sunsetSnapshot.sunsetAt,

          timezone:
            sunsetSnapshot.timezone,

          latitude:
            sunsetSnapshot.latitude.toString(),

          longitude:
            sunsetSnapshot.longitude.toString(),

          createdAt:
            sunsetSnapshot.createdAt,
        }
      : null,
  });

  let passed = 0;
  let failed = 0;

  async function test(
    name: string,
    fn: () => void | Promise<void>,
  ) {
    try {
      await fn();

      passed += 1;
      pass(name);
    } catch (error) {
      failed += 1;
      fail(name);
      console.error(error);
    }
  }

  printSection("TEST CASES");

  await test(
    "1. Snapshot จริงล่าสุดทั้ง 3 ตัวต้องตรงกับ Trip ปัจจุบัน",
    () => {
      assertLiveSnapshotsMatchTrip({
        trip,
        weatherSnapshot,
        routeSnapshot,
        sunsetSnapshot,
      });
    },
  );

  await test(
    "2. ไม่มี Weather snapshot ต้องได้ missing_weather_snapshot",
    () => {
      expectMissing(
        "missing_weather_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot: null,
            routeSnapshot,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "3. ไม่มี Route snapshot ต้องได้ missing_route_snapshot",
    () => {
      expectMissing(
        "missing_route_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot,
            routeSnapshot: null,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "4. ไม่มี Sunset snapshot ต้องได้ missing_sunset_snapshot",
    () => {
      expectMissing(
        "missing_sunset_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot: null,
          });
        },
      );
    },
  );

  await test(
    "5. เปลี่ยน originLat แต่ยังใช้ Route snapshot เก่า ต้อง stale_route_snapshot",
    () => {
      assert.ok(
        routeSnapshot,
        "Route snapshot required",
      );

      assert.ok(
        trip.originLat,
        "Trip originLat required",
      );

      const changedTrip = {
        ...trip,

        originLat:
          Number(
            trip.originLat.toString(),
          ) + 0.01,
      };

      expectStale(
        "stale_route_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip: changedTrip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "6. เปลี่ยน originLng แต่ยังใช้ Route snapshot เก่า ต้อง stale_route_snapshot",
    () => {
      assert.ok(
        routeSnapshot,
        "Route snapshot required",
      );

      assert.ok(
        trip.originLng,
        "Trip originLng required",
      );

      const changedTrip = {
        ...trip,

        originLng:
          Number(
            trip.originLng.toString(),
          ) + 0.01,
      };

      expectStale(
        "stale_route_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip: changedTrip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "7. เปลี่ยน tripDate แต่ยังใช้ Weather snapshot เก่า ต้อง stale_weather_snapshot",
    () => {
      const changedDate =
        new Date(trip.tripDate);

      changedDate.setUTCDate(
        changedDate.getUTCDate() + 1,
      );

      const changedTrip = {
        ...trip,
        tripDate: changedDate,
      };

      expectStale(
        "stale_weather_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip: changedTrip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "8. Weather พิกัดไม่ตรงกับ Park ต้อง stale_weather_snapshot",
    () => {
      assert.ok(
        weatherSnapshot,
        "Weather snapshot required",
      );

      const changedWeather = {
        ...weatherSnapshot,

        latitude:
          Number(
            weatherSnapshot.latitude.toString(),
          ) + 0.01,
      };

      expectStale(
        "stale_weather_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot:
              changedWeather,

            routeSnapshot,
            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "9. Route destination ไม่ตรงกับ Park ต้อง stale_route_snapshot",
    () => {
      assert.ok(
        routeSnapshot,
        "Route snapshot required",
      );

      const changedRoute = {
        ...routeSnapshot,

        destinationLat:
          Number(
            routeSnapshot.destinationLat.toString(),
          ) + 0.01,
      };

      expectStale(
        "stale_route_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot,
            routeSnapshot:
              changedRoute,

            sunsetSnapshot,
          });
        },
      );
    },
  );

  await test(
    "10. Sunset พิกัดไม่ตรงกับ Park ต้อง stale_sunset_snapshot",
    () => {
      assert.ok(
        sunsetSnapshot,
        "Sunset snapshot required",
      );

      const changedSunset = {
        ...sunsetSnapshot,

        longitude:
          Number(
            sunsetSnapshot.longitude.toString(),
          ) + 0.01,
      };

      expectStale(
        "stale_sunset_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot:
              changedSunset,
          });
        },
      );
    },
  );

  await test(
    "11. Sunset วันที่ไม่ตรงกับ Trip ต้อง stale_sunset_snapshot",
    () => {
      assert.ok(
        sunsetSnapshot,
        "Sunset snapshot required",
      );

      const changedSunsetAt =
        new Date(
          sunsetSnapshot.sunsetAt,
        );

      changedSunsetAt.setUTCDate(
        changedSunsetAt.getUTCDate() + 1,
      );

      const changedSunset = {
        ...sunsetSnapshot,

        sunsetAt:
          changedSunsetAt,
      };

      expectStale(
        "stale_sunset_snapshot",
        () => {
          assertLiveSnapshotsMatchTrip({
            trip,
            weatherSnapshot,
            routeSnapshot,
            sunsetSnapshot:
              changedSunset,
          });
        },
      );
    },
  );

  await test(
    "12. พิกัดต่างเพียงระดับเล็กมากต้องยังถือว่าตรงกัน",
    () => {
      assert.ok(
        routeSnapshot,
        "Route snapshot required",
      );

      const tinyDifferenceRoute = {
        ...routeSnapshot,

        originLat:
          Number(
            routeSnapshot.originLat.toString(),
          ) + 0.000001,
      };

      assert.doesNotThrow(() => {
        assertLiveSnapshotsMatchTrip({
          trip,
          weatherSnapshot,

          routeSnapshot:
            tinyDifferenceRoute,

          sunsetSnapshot,
        });
      });
    },
  );

  printSection("RESULT");

  console.log(
    `PASS: ${passed}/12`,
  );

  console.log(
    `FAIL: ${failed}/12`,
  );

  if (failed > 0) {
    process.exitCode = 1;

    console.log(
      "\n❌ Real snapshot consistency test FAILED.",
    );

    return;
  }

  console.log(
    "\n✅ Real snapshot consistency test PASSED.",
  );

  console.log(
    "✅ Database was read only; no Trip/Snapshot/Evaluation records were modified.",
  );
}

main()
  .catch((error) => {
    console.error(
      "\nUnexpected test error:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });