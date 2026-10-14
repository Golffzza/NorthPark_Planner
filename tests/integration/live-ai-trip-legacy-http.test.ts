import { describe, expect, it } from "vitest";

import { getSessionCookieName, issueUserSession } from "@/lib/auth/session-service";
import { prisma } from "@/lib/db/prisma";

const baseUrl = process.env.LIVE_AI_TRIP_BASE_URL ?? "http://localhost:3001";

describe.skipIf(process.env.RUN_LIVE_AI_TRIP !== "1")("live legacy trip regression", () => {
  it("opens and evaluates a trip without an itinerary through authenticated HTTP", async () => {
    const userId = crypto.randomUUID();
    await prisma.user.create({ data: { id: userId, displayName: "AI trip legacy HTTP test" } });
    try {
      const park = await prisma.park.findFirstOrThrow({ where: { isActive: true }, select: { id: true } });
      const trip = await prisma.trip.create({
        data: {
          userId, parkId: park.id, tripDate: new Date("2026-11-20T00:00:00.000Z"), departAt: "07:30",
          originText: "จุดเริ่มต้นทดสอบ NorthPark", transportMode: "CAR", travelerCount: 1,
          weatherCondition: "CLOUDY", estimatedTravelMinutes: 90, mockSunsetTime: "18:00",
        },
        select: { id: true },
      });
      const cookie = `${getSessionCookieName()}=${await issueUserSession(userId)}`;
      const headers = { Cookie: cookie };
      const listed = await fetch(`${baseUrl}/api/v1/trips`, { headers, signal: AbortSignal.timeout(10000) });
      const list = await listed.json();
      expect(listed.status).toBe(200);
      expect(list.data.some((item: { id: string }) => item.id === trip.id)).toBe(true);
      const detail = await fetch(`${baseUrl}/api/v1/trips/${trip.id}`, { headers, signal: AbortSignal.timeout(10000) });
      const record = await detail.json();
      expect(detail.status).toBe(200);
      expect(record.data.itineraryDays).toEqual([]);
      const started = performance.now();
      const evaluated = await fetch(`${baseUrl}/api/v1/trips/${trip.id}/evaluate`, { method: "POST", headers, signal: AbortSignal.timeout(115000) });
      const result = await evaluated.json();
      console.log(JSON.stringify({ phase: "legacy_evaluation", http: evaluated.status, elapsedMs: Math.round(performance.now() - started), score: result.data?.evaluation?.totalScore, error: result.error?.code }));
      expect(evaluated.status).toBe(200);
      expect(result.data.tripId).toBe(trip.id);
      expect(await prisma.tripEvaluation.count({ where: { tripId: trip.id } })).toBe(1);
    } finally {
      await prisma.trip.deleteMany({ where: { userId } });
      await prisma.userSession.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  }, 150000);
});
