import { prisma } from "../lib/db/prisma";

type ConstraintLike = { code?: string; severity?: string; message?: string };
type RefreshResponse = {
  data?: {
    tripId?: string;
    snapshots?: {
      weather?: { id?: string };
      route?: { id?: string };
      sunset?: { id?: string };
    };
    evaluation?: { id?: string };
  };
  error?: { code?: string; message?: string };
};

let passCount = 0;
let skipCount = 0;

function pass(name: string) {
  passCount++;
  console.log(`PASS  ${name}`);
}

function skip(name: string, detail: string) {
  skipCount++;
  console.log(`SKIP  ${name} — ${detail}`);
}

function assert(condition: unknown, name: string, detail?: unknown): asserts condition {
  if (!condition) {
    console.error(`FAIL  ${name}`);
    if (detail !== undefined) console.error(detail);
    throw new Error(name);
  }
  pass(name);
}

function parseConstraints(value: unknown): ConstraintLike[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
    .map((x) => ({
      code: typeof x.code === "string" ? x.code : undefined,
      severity: typeof x.severity === "string" ? x.severity : undefined,
      message: typeof x.message === "string" ? x.message : undefined,
    }));
}

async function refresh(baseUrl: string, tripId: string): Promise<RefreshResponse> {
  const cookie = process.env.TEST_COOKIE?.trim();
  const res = await fetch(
    `${baseUrl}/api/v1/trips/${encodeURIComponent(tripId)}/refresh-evaluation`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    },
  );

  const text = await res.text();
  let json: RefreshResponse = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 800)}`);
    }
  }

  if (!res.ok) {
    throw new Error(
      `refresh-evaluation failed (${res.status}): ${
        json.error?.message ?? json.error?.code ?? text
      }\n${cookie ? "TEST_COOKIE was provided." : "No TEST_COOKIE was provided."}`,
    );
  }

  return json;
}

async function main() {
  console.log("\n=== Evaluation Hardening REAL Smoke Test ===\n");

  const tripId = process.argv[2] ?? process.env.TEST_TRIP_ID?.trim();
  const baseUrl = (process.env.BASE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

  assert(
    tripId,
    "Trip ID was provided",
    "Usage: npx tsx scripts/test-evaluation-hardening-real.ts <TRIP_ID>",
  );

  const before = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      status: true,
      tripDate: true,
      departAt: true,
      park: {
        select: { nameTh: true, openTime: true, closeTime: true },
      },
      _count: {
        select: {
          evaluations: true,
          weatherSnapshots: true,
          routeSnapshots: true,
          sunsetSnapshots: true,
        },
      },
    },
  });

  assert(before, "Target Trip exists");
  if (before.status === "CANCELLED") {
    throw new Error("Target Trip is CANCELLED. Use a non-cancelled Trip.");
  }

  console.log({
    tripId: before.id,
    status: before.status,
    tripDate: before.tripDate.toISOString(),
    departAt: before.departAt,
    park: before.park.nameTh,
    parkHours: `${before.park.openTime} - ${before.park.closeTime}`,
    countsBefore: before._count,
  });

  console.log(`\nPOST ${baseUrl}/api/v1/trips/${tripId}/refresh-evaluation\n`);
  const result = await refresh(baseUrl, tripId);

  assert(result.data, "Canonical refresh endpoint returned data");
  assert(result.data.tripId === tripId, "Canonical refresh returned the same Trip ID");

  const weatherId = result.data.snapshots?.weather?.id;
  const routeId = result.data.snapshots?.route?.id;
  const sunsetId = result.data.snapshots?.sunset?.id;

  assert(weatherId, "Refresh returned WeatherSnapshot ID");
  assert(routeId, "Refresh returned RouteSnapshot ID");
  assert(sunsetId, "Refresh returned SunsetSnapshot ID");

  const responseEvaluationId = result.data.evaluation?.id;

  const evaluation = responseEvaluationId
    ? await prisma.tripEvaluation.findUnique({ where: { id: responseEvaluationId } })
    : await prisma.tripEvaluation.findFirst({
        where: { tripId },
        orderBy: { createdAt: "desc" },
      });

  assert(evaluation, "A TripEvaluation row was persisted");

  if (responseEvaluationId) {
    assert(
      evaluation.id === responseEvaluationId,
      "DB evaluation matches endpoint evaluation ID",
    );
  } else {
    skip(
      "DB evaluation matches endpoint evaluation ID",
      "Evaluation DTO did not expose id; latest persisted evaluation was used.",
    );
  }

  assert(
    evaluation.weatherSnapshotId === weatherId,
    "Evaluation bound exact WeatherSnapshot",
    { db: evaluation.weatherSnapshotId, refresh: weatherId },
  );
  assert(
    evaluation.routeSnapshotId === routeId,
    "Evaluation bound exact RouteSnapshot",
    { db: evaluation.routeSnapshotId, refresh: routeId },
  );
  assert(
    evaluation.sunsetSnapshotId === sunsetId,
    "Evaluation bound exact SunsetSnapshot",
    { db: evaluation.sunsetSnapshotId, refresh: sunsetId },
  );

  const [weather, route, sunset] = await Promise.all([
    prisma.weatherSnapshot.findUnique({ where: { id: weatherId } }),
    prisma.routeSnapshot.findUnique({ where: { id: routeId } }),
    prisma.sunsetSnapshot.findUnique({ where: { id: sunsetId } }),
  ]);

  assert(weather, "Bound WeatherSnapshot exists");
  assert(route, "Bound RouteSnapshot exists");
  assert(sunset, "Bound SunsetSnapshot exists");

  assert(
    weather.tripId === tripId && route.tripId === tripId && sunset.tripId === tripId,
    "All bound snapshots belong to the same Trip",
  );

  const constraints = parseConstraints(evaluation.constraints);
  const afterClose = constraints.filter((x) => x.code === "ARRIVAL_AFTER_PARK_CLOSE");

  if (afterClose.length) {
    assert(
      afterClose.every((x) => x.severity !== "BLOCKING"),
      "ARRIVAL_AFTER_PARK_CLOSE is non-blocking",
      afterClose,
    );

    const otherBlocking = constraints.filter(
      (x) => x.severity === "BLOCKING" && x.code !== "ARRIVAL_AFTER_PARK_CLOSE",
    );

    if (!otherBlocking.length) {
      assert(
        evaluation.canProceed === true,
        "After-close warning alone does not set canProceed=false",
        { canProceed: evaluation.canProceed, constraints },
      );
    } else {
      skip(
        "After-close warning alone keeps canProceed=true",
        "Another blocking constraint also exists.",
      );
    }
  } else {
    skip(
      "ARRIVAL_AFTER_PARK_CLOSE is non-blocking",
      "This Trip did not hit the after-close branch.",
    );
  }

  const after = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      status: true,
      _count: {
        select: {
          evaluations: true,
          weatherSnapshots: true,
          routeSnapshots: true,
          sunsetSnapshots: true,
        },
      },
    },
  });

  assert(after, "Trip still exists after refresh");

  console.log("\nEvaluation:");
  console.log({
    evaluationId: evaluation.id,
    totalScore: evaluation.totalScore,
    level: evaluation.level,
    canProceed: evaluation.canProceed,
    constraints,
    provenance: {
      weatherSnapshotId: evaluation.weatherSnapshotId,
      routeSnapshotId: evaluation.routeSnapshotId,
      sunsetSnapshotId: evaluation.sunsetSnapshotId,
    },
    countsBefore: before._count,
    countsAfter: after._count,
    tripStatusAfter: after.status,
  });

  console.log("\n=== RESULT ===");
  console.log(`PASS ${passCount}`);
  console.log(`SKIP ${skipCount}`);
  console.log("FAIL 0");
  console.log("\nCanonical real evaluation flow looks healthy.");
}

main()
  .catch((error) => {
    console.error("\nTEST FAILED\n");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
