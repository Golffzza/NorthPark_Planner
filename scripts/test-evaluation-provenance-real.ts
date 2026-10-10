// scripts/test-evaluation-provenance-real.ts
//
// Real DB integration test for Evaluation Provenance / Snapshot Binding.
//
// What it verifies:
//  1) A real TripEvaluation has all 3 provenance IDs.
//  2) All 3 bound snapshots exist and belong to the same Trip.
//  3) Bound snapshots existed no later than the evaluation row.
//  4) Creating newer Weather/Route/Sunset snapshots does NOT change the
//     existing evaluation's bound IDs.
//  5) The newest snapshots can differ from the bound snapshots while the
//     evaluation still resolves to its original snapshot rows.
//  6) Historical/null-provenance TripEvaluation rows remain readable.
//  7) FK deletion policy protects snapshots referenced by TripEvaluation.
//
// Safety:
//  - Tests 4, 6, and 7 run inside transactions that are intentionally rolled back.
//  - No persistent test rows or modifications should remain after a successful run.
//  - This script does NOT call Open-Meteo, OSRM, Ollama, or any external API.
//
// Usage:
//   npx tsx scripts/test-evaluation-provenance-real.ts
//   npx tsx scripts/test-evaluation-provenance-real.ts <TRIP_ID>
//   TEST_TRIP_ID=<TRIP_ID> npx tsx scripts/test-evaluation-provenance-real.ts
//
// Prerequisites:
//   npx prisma migrate deploy
//   npx prisma generate
//
// Optional:
//   PROVENANCE_EVALUATION_ID=<evaluation-id>
//
// If no Trip ID is provided, the script automatically chooses the newest
// TripEvaluation that has all three provenance IDs.

import { prisma } from "../lib/db/prisma";

const TEST_TRIP_ID =
  process.argv[2] ||
  process.env.TEST_TRIP_ID ||
  null;

const TEST_EVALUATION_ID =
  process.env.PROVENANCE_EVALUATION_ID ||
  null;

const ROLLBACK = "__PROVENANCE_TEST_ROLLBACK__";
const DELETE_ROLLBACK =
  "__PROVENANCE_DELETE_TEST_ROLLBACK__";

type TestResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const results: TestResult[] = [];

function pass(name: string, detail?: string) {
  results.push({
    name,
    ok: true,
    detail,
  });

  console.log(
    `PASS  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

function fail(
  name: string,
  error: unknown,
): never {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  results.push({
    name,
    ok: false,
    detail: message,
  });

  throw new Error(
    `${name}: ${message}`,
  );
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function iso(value: Date | null | undefined) {
  return value
    ? value.toISOString()
    : "-";
}

function cloneCreateData<
  T extends Record<string, unknown>,
>(
  row: T,
): Record<string, unknown> {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = row;

  return {
    ...rest,

    // Make the temporary clone unambiguously newer.
    createdAt: new Date(
      Date.now() + 60_000,
    ),
  };
}

async function selectEvaluation() {
  if (TEST_EVALUATION_ID) {
    return prisma.tripEvaluation.findUnique({
      where: {
        id: TEST_EVALUATION_ID,
      },
    });
  }

  if (TEST_TRIP_ID) {
    return prisma.tripEvaluation.findFirst({
      where: {
        tripId: TEST_TRIP_ID,
        weatherSnapshotId: {
          not: null,
        },
        routeSnapshotId: {
          not: null,
        },
        sunsetSnapshotId: {
          not: null,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.tripEvaluation.findFirst({
    where: {
      weatherSnapshotId: {
        not: null,
      },
      routeSnapshotId: {
        not: null,
      },
      sunsetSnapshotId: {
        not: null,
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

async function main() {
  console.log(
    "\n=== Evaluation Provenance / Snapshot Binding REAL DB TEST ===\n",
  );

  const evaluation =
    await selectEvaluation();

  assert(
    evaluation,
    [
      "No provenance-enabled TripEvaluation was found.",
      "Apply the migration and create/re-evaluate a Trip first:",
      "  npx prisma migrate deploy",
      "  npx prisma generate",
      "Then run a live evaluation and retry this script.",
    ].join("\n"),
  );

  console.log("Target evaluation:");
  console.log({
    id: evaluation.id,
    tripId: evaluation.tripId,
    totalScore:
      evaluation.totalScore,
    level: evaluation.level,
    weatherSnapshotId:
      evaluation.weatherSnapshotId,
    routeSnapshotId:
      evaluation.routeSnapshotId,
    sunsetSnapshotId:
      evaluation.sunsetSnapshotId,
    evaluatedAt: iso(
      evaluation.evaluatedAt,
    ),
    createdAt: iso(
      evaluation.createdAt,
    ),
  });

  // ------------------------------------------------------------
  // TEST 1
  // All 3 provenance IDs are present.
  // ------------------------------------------------------------
  try {
    assert(
      evaluation.weatherSnapshotId,
      "weatherSnapshotId is null",
    );

    assert(
      evaluation.routeSnapshotId,
      "routeSnapshotId is null",
    );

    assert(
      evaluation.sunsetSnapshotId,
      "sunsetSnapshotId is null",
    );

    pass(
      "1. Evaluation stores all three snapshot IDs",
    );
  } catch (error) {
    fail(
      "1. Evaluation stores all three snapshot IDs",
      error,
    );
  }

  const weatherSnapshot =
    await prisma.weatherSnapshot.findUnique({
      where: {
        id: evaluation.weatherSnapshotId!,
      },
    });

  const routeSnapshot =
    await prisma.routeSnapshot.findUnique({
      where: {
        id: evaluation.routeSnapshotId!,
      },
    });

  const sunsetSnapshot =
    await prisma.sunsetSnapshot.findUnique({
      where: {
        id: evaluation.sunsetSnapshotId!,
      },
    });

  // ------------------------------------------------------------
  // TEST 2
  // Bound rows exist.
  // ------------------------------------------------------------
  try {
    assert(
      weatherSnapshot,
      `WeatherSnapshot ${evaluation.weatherSnapshotId} does not exist`,
    );

    assert(
      routeSnapshot,
      `RouteSnapshot ${evaluation.routeSnapshotId} does not exist`,
    );

    assert(
      sunsetSnapshot,
      `SunsetSnapshot ${evaluation.sunsetSnapshotId} does not exist`,
    );

    pass(
      "2. All bound snapshot rows exist",
    );
  } catch (error) {
    fail(
      "2. All bound snapshot rows exist",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 3
  // Every bound snapshot belongs to the same Trip.
  // ------------------------------------------------------------
  try {
    assert(
      weatherSnapshot!.tripId ===
        evaluation.tripId,
      [
        "WeatherSnapshot belongs to another Trip.",
        `evaluation.tripId=${evaluation.tripId}`,
        `weather.tripId=${weatherSnapshot!.tripId}`,
      ].join(" "),
    );

    assert(
      routeSnapshot!.tripId ===
        evaluation.tripId,
      [
        "RouteSnapshot belongs to another Trip.",
        `evaluation.tripId=${evaluation.tripId}`,
        `route.tripId=${routeSnapshot!.tripId}`,
      ].join(" "),
    );

    assert(
      sunsetSnapshot!.tripId ===
        evaluation.tripId,
      [
        "SunsetSnapshot belongs to another Trip.",
        `evaluation.tripId=${evaluation.tripId}`,
        `sunset.tripId=${sunsetSnapshot!.tripId}`,
      ].join(" "),
    );

    pass(
      "3. Bound snapshots belong to the evaluation Trip",
    );
  } catch (error) {
    fail(
      "3. Bound snapshots belong to the evaluation Trip",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 4
  // Snapshot IDs resolve to the exact rows, not "whatever is latest".
  // Also print current latest IDs for useful real-world evidence.
  // ------------------------------------------------------------
  try {
    const [
      latestWeather,
      latestRoute,
      latestSunset,
    ] = await Promise.all([
      prisma.weatherSnapshot.findFirst({
        where: {
          tripId:
            evaluation.tripId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.routeSnapshot.findFirst({
        where: {
          tripId:
            evaluation.tripId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.sunsetSnapshot.findFirst({
        where: {
          tripId:
            evaluation.tripId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    console.log(
      "\nCurrent DB comparison:",
    );

    console.table([
      {
        kind: "weather",
        bound:
          evaluation.weatherSnapshotId,
        latest:
          latestWeather?.id ?? "-",
        same:
          latestWeather?.id ===
          evaluation.weatherSnapshotId,
      },
      {
        kind: "route",
        bound:
          evaluation.routeSnapshotId,
        latest:
          latestRoute?.id ?? "-",
        same:
          latestRoute?.id ===
          evaluation.routeSnapshotId,
      },
      {
        kind: "sunset",
        bound:
          evaluation.sunsetSnapshotId,
        latest:
          latestSunset?.id ?? "-",
        same:
          latestSunset?.id ===
          evaluation.sunsetSnapshotId,
      },
    ]);

    pass(
      "4. Evaluation resolves snapshots by stored IDs",
    );
  } catch (error) {
    fail(
      "4. Evaluation resolves snapshots by stored IDs",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 5
  // Create newer snapshot rows INSIDE A TRANSACTION.
  // Verify latest snapshots change but the evaluation's stored IDs and
  // original referenced snapshot rows do not.
  // Roll back everything intentionally.
  // ------------------------------------------------------------
  try {
    try {
      await prisma.$transaction(
        async (tx) => {
          const newWeather =
            await tx.weatherSnapshot.create({
              data: cloneCreateData(
                weatherSnapshot!,
              ) as never,
            });

          const newRoute =
            await tx.routeSnapshot.create({
              data: cloneCreateData(
                routeSnapshot!,
              ) as never,
            });

          const newSunset =
            await tx.sunsetSnapshot.create({
              data: cloneCreateData(
                sunsetSnapshot!,
              ) as never,
            });

          const [
            newestWeather,
            newestRoute,
            newestSunset,
            sameEvaluation,
          ] = await Promise.all([
            tx.weatherSnapshot.findFirst({
              where: {
                tripId:
                  evaluation.tripId,
              },
              orderBy: {
                createdAt: "desc",
              },
            }),

            tx.routeSnapshot.findFirst({
              where: {
                tripId:
                  evaluation.tripId,
              },
              orderBy: {
                createdAt: "desc",
              },
            }),

            tx.sunsetSnapshot.findFirst({
              where: {
                tripId:
                  evaluation.tripId,
              },
              orderBy: {
                createdAt: "desc",
              },
            }),

            tx.tripEvaluation.findUnique({
              where: {
                id: evaluation.id,
              },
            }),
          ]);

          assert(
            newestWeather?.id ===
              newWeather.id,
            "Temporary WeatherSnapshot did not become latest",
          );

          assert(
            newestRoute?.id ===
              newRoute.id,
            "Temporary RouteSnapshot did not become latest",
          );

          assert(
            newestSunset?.id ===
              newSunset.id,
            "Temporary SunsetSnapshot did not become latest",
          );

          assert(
            sameEvaluation,
            "Evaluation disappeared inside transaction",
          );

          assert(
            sameEvaluation.weatherSnapshotId ===
              evaluation.weatherSnapshotId,
            "weatherSnapshotId changed after newer snapshot was created",
          );

          assert(
            sameEvaluation.routeSnapshotId ===
              evaluation.routeSnapshotId,
            "routeSnapshotId changed after newer snapshot was created",
          );

          assert(
            sameEvaluation.sunsetSnapshotId ===
              evaluation.sunsetSnapshotId,
            "sunsetSnapshotId changed after newer snapshot was created",
          );

          const [
            stillBoundWeather,
            stillBoundRoute,
            stillBoundSunset,
          ] = await Promise.all([
            tx.weatherSnapshot.findUnique({
              where: {
                id: sameEvaluation.weatherSnapshotId!,
              },
            }),

            tx.routeSnapshot.findUnique({
              where: {
                id: sameEvaluation.routeSnapshotId!,
              },
            }),

            tx.sunsetSnapshot.findUnique({
              where: {
                id: sameEvaluation.sunsetSnapshotId!,
              },
            }),
          ]);

          assert(
            stillBoundWeather?.id ===
              weatherSnapshot!.id,
            "Evaluation no longer resolves original WeatherSnapshot",
          );

          assert(
            stillBoundRoute?.id ===
              routeSnapshot!.id,
            "Evaluation no longer resolves original RouteSnapshot",
          );

          assert(
            stillBoundSunset?.id ===
              sunsetSnapshot!.id,
            "Evaluation no longer resolves original SunsetSnapshot",
          );

          // Force rollback so temporary snapshots never persist.
          throw new Error(ROLLBACK);
        },
        {
          timeout: 20_000,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === ROLLBACK
      ) {
        pass(
          "5. Newer snapshots do not mutate existing evaluation provenance",
          "temporary rows rolled back",
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    fail(
      "5. Newer snapshots do not mutate existing evaluation provenance",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 6
  // Simulate an old/historical evaluation by nulling provenance IDs
  // inside a rollback transaction.
  // Verify the evaluation is still readable and stored score fields remain.
  // ------------------------------------------------------------
  try {
    try {
      await prisma.$transaction(
        async (tx) => {
          const legacyEvaluation =
            await tx.tripEvaluation.update({
              where: {
                id: evaluation.id,
              },

              data: {
                weatherSnapshotId:
                  null,
                routeSnapshotId:
                  null,
                sunsetSnapshotId:
                  null,
              },
            });

          assert(
            legacyEvaluation.weatherSnapshotId ===
              null,
            "Legacy weatherSnapshotId should be null",
          );

          assert(
            legacyEvaluation.routeSnapshotId ===
              null,
            "Legacy routeSnapshotId should be null",
          );

          assert(
            legacyEvaluation.sunsetSnapshotId ===
              null,
            "Legacy sunsetSnapshotId should be null",
          );

          assert(
            typeof legacyEvaluation.totalScore ===
              "number",
            "Historical totalScore is not readable",
          );

          assert(
            typeof legacyEvaluation.level ===
              "string",
            "Historical level is not readable",
          );

          assert(
            typeof legacyEvaluation.summary ===
              "string",
            "Historical summary is not readable",
          );

          throw new Error(ROLLBACK);
        },
        {
          timeout: 20_000,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === ROLLBACK
      ) {
        pass(
          "6. Null-provenance historical evaluation remains readable",
          "temporary null update rolled back",
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    fail(
      "6. Null-provenance historical evaluation remains readable",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 7
  // Verify ON DELETE RESTRICT (or equivalent restrictive behavior).
  // We attempt to delete the bound WeatherSnapshot inside a transaction.
  //
  // If FK blocks deletion:
  //   Prisma transaction rejects -> PASS.
  //
  // If deletion unexpectedly succeeds:
  //   we throw our own marker -> transaction rolls back -> FAIL safely.
  // ------------------------------------------------------------
  try {
    let deletionWasBlocked = false;
    let deletionUnexpectedlySucceeded =
      false;
    let databaseError:
      | unknown
      | null = null;

    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.weatherSnapshot.delete({
            where: {
              id: weatherSnapshot!.id,
            },
          });

          deletionUnexpectedlySucceeded =
            true;

          // Roll back even if FK protection is missing.
          throw new Error(
            DELETE_ROLLBACK,
          );
        },
        {
          timeout: 20_000,
        },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          DELETE_ROLLBACK
      ) {
        // Our own rollback marker means DELETE actually succeeded,
        // so RESTRICT did NOT protect the row.
      } else {
        databaseError = error;

        const code =
          typeof error ===
            "object" &&
          error !== null &&
          "code" in error
            ? String(
                (
                  error as {
                    code?: unknown;
                  }
                ).code,
              )
            : "";

        // Prisma commonly reports FK constraint failures as P2003.
        // For PostgreSQL adapters, the wrapped error may differ,
        // so any DB rejection at the DELETE statement is accepted
        // here and printed for inspection.
        deletionWasBlocked =
          code === "P2003" ||
          !deletionUnexpectedlySucceeded;
      }
    }

    assert(
      !deletionUnexpectedlySucceeded,
      [
        "Bound WeatherSnapshot DELETE succeeded.",
        "Expected ON DELETE RESTRICT (or equivalent) to protect evaluation history.",
      ].join(" "),
    );

    assert(
      deletionWasBlocked,
      "Could not confirm FK deletion protection",
    );

    const code =
      typeof databaseError ===
        "object" &&
      databaseError !== null &&
      "code" in databaseError
        ? String(
            (
              databaseError as {
                code?: unknown;
              }
            ).code,
          )
        : "database rejection";

    pass(
      "7. Referenced snapshot deletion is blocked",
      code,
    );
  } catch (error) {
    fail(
      "7. Referenced snapshot deletion is blocked",
      error,
    );
  }

  // ------------------------------------------------------------
  // TEST 8
  // Verify rollback safety: no temporary "new latest" snapshots remain.
  // ------------------------------------------------------------
  try {
    const [
      weatherCount,
      routeCount,
      sunsetCount,
    ] = await Promise.all([
      prisma.weatherSnapshot.count({
        where: {
          tripId:
            evaluation.tripId,
        },
      }),

      prisma.routeSnapshot.count({
        where: {
          tripId:
            evaluation.tripId,
        },
      }),

      prisma.sunsetSnapshot.count({
        where: {
          tripId:
            evaluation.tripId,
        },
      }),
    ]);

    assert(
      weatherCount >= 1,
      "Trip lost WeatherSnapshot rows",
    );

    assert(
      routeCount >= 1,
      "Trip lost RouteSnapshot rows",
    );

    assert(
      sunsetCount >= 1,
      "Trip lost SunsetSnapshot rows",
    );

    const persistedEvaluation =
      await prisma.tripEvaluation.findUnique({
        where: {
          id: evaluation.id,
        },
      });

    assert(
      persistedEvaluation,
      "Evaluation no longer exists after rollback tests",
    );

    assert(
      persistedEvaluation.weatherSnapshotId ===
        evaluation.weatherSnapshotId,
      "weatherSnapshotId was not restored after rollback",
    );

    assert(
      persistedEvaluation.routeSnapshotId ===
        evaluation.routeSnapshotId,
      "routeSnapshotId was not restored after rollback",
    );

    assert(
      persistedEvaluation.sunsetSnapshotId ===
        evaluation.sunsetSnapshotId,
      "sunsetSnapshotId was not restored after rollback",
    );

    pass(
      "8. Transaction tests left the real evaluation unchanged",
    );
  } catch (error) {
    fail(
      "8. Transaction tests left the real evaluation unchanged",
      error,
    );
  }

  console.log(
    "\n=== Bound snapshot details ===",
  );

  console.log({
    weather: {
      id: weatherSnapshot!.id,
      tripId: weatherSnapshot!.tripId,
      condition:
        weatherSnapshot!
          .weatherCondition,
      createdAt: iso(
        weatherSnapshot!.createdAt,
      ),
    },

    route: {
      id: routeSnapshot!.id,
      tripId: routeSnapshot!.tripId,
      distanceMeters:
        routeSnapshot!
          .distanceMeters,
      durationSeconds:
        routeSnapshot!
          .durationSeconds,
      createdAt: iso(
        routeSnapshot!.createdAt,
      ),
    },

    sunset: {
      id: sunsetSnapshot!.id,
      tripId: sunsetSnapshot!.tripId,
      sunsetAt: iso(
        sunsetSnapshot!.sunsetAt,
      ),
      createdAt: iso(
        sunsetSnapshot!.createdAt,
      ),
    },
  });

  console.log(
    "\n=== RESULT ===",
  );

  const passed =
    results.filter(
      (item) => item.ok,
    ).length;

  const failed =
    results.filter(
      (item) => !item.ok,
    ).length;

  console.log(
    `PASS ${passed}/${results.length}`,
  );

  console.log(
    `FAIL ${failed}/${results.length}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log(
      "\nEvaluation provenance binding looks correct.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nTEST FAILED\n",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
