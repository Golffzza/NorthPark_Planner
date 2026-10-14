import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { issueUserSession, getSessionCookieName } from "@/lib/auth/session-service";

const baseUrl = process.env.LIVE_AI_TRIP_BASE_URL ?? "http://localhost:3001";
const testDate = "2026-11-20";
const travelDetails = {
  tripDate: testDate,
  departAt: "07:30",
  originText: "จุดเริ่มต้นทดสอบ NorthPark",
  transportMode: "CAR",
  travelerCount: 1,
  weatherCondition: "CLOUDY",
  estimatedTravelMinutes: 90,
};

type Draft = {
  draftId: string;
  revision: number;
  park: { slug: string; name: string };
  durationDays: number;
  savedTripId?: string;
  verifiedActivities: Array<{ name: string; sourceReference?: string }>;
  days: Array<{ day: number; title: string; items: string[] }>;
};

async function jsonRequest(path: string, cookie: string, method = "GET", body?: unknown, timeoutMs = 10000) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await response.json();
  return { status: response.status, json, elapsedMs: Math.round(performance.now() - started) };
}

describe.skipIf(process.env.RUN_LIVE_AI_TRIP !== "1")("live authenticated AI trip HTTP flow", () => {
  it("uses Gemini tools and persists a confirmed draft through the real app", async () => {
    const firstUserId = crypto.randomUUID();
    const secondUserId = crypto.randomUUID();
    let firstCreated = false;
    let secondCreated = false;
    try {
      await prisma.user.create({ data: { id: firstUserId, displayName: "AI trip live test 1" } });
      firstCreated = true;
      await prisma.user.create({ data: { id: secondUserId, displayName: "AI trip live test 2" } });
      secondCreated = true;
      const firstCookie = `${getSessionCookieName()}=${await issueUserSession(firstUserId)}`;
      const secondCookie = `${getSessionCookieName()}=${await issueUserSession(secondUserId)}`;

      const chat = async (message: string, conversationId?: string) => {
        const result = await jsonRequest("/api/v2/assistant/chat", firstCookie, "POST", { message, ...(conversationId ? { conversationId } : {}) }, 115000);
        const data = result.json.data;
        console.log(JSON.stringify({ phase: "gemini", message, http: result.status, elapsedMs: result.elapsedMs, conversationId: data?.conversationId, tools: data?.diagnostics?.toolCalls?.map((call: { toolName: string; output?: { status?: string } }) => ({ name: call.toolName, status: call.output?.status })) ?? [], error: result.json.error?.code }));
        expect(result.status).toBe(200);
        expect(data?.conversationId).toBeTypeOf("string");
        return data as { conversationId: string; message: string; diagnostics: { toolCalls: Array<{ toolName: string; output?: { status?: string } }> } };
      };

      const introduction = await chat("อยากไปเที่ยวอุทยานแห่งชาติลานสาง");
      const conversationId = introduction.conversationId;
      const planned = await chat("ช่วยจัดทริป 2 วันให้หน่อย", conversationId);
      expect(planned.diagnostics.toolCalls.some((call) => call.toolName === "planTrip" && call.output?.status === "OK")).toBe(true);

      const readDraft = async () => {
        const result = await jsonRequest(`/api/v2/assistant/trip-draft?conversationId=${conversationId}`, firstCookie);
        expect(result.status).toBe(200);
        return result.json.data as Draft;
      };
      let draft = await readDraft();
      console.log(JSON.stringify({ phase: "draft_created", revision: draft?.revision, days: draft?.days?.map((day) => ({ day: day.day, count: day.items.length })), park: draft?.park?.slug }));
      expect(draft?.park.slug).toBe("lan-sang");
      expect(draft?.durationDays).toBe(2);

      const reviewed = await chat("ขอดูแผนที่จัดไว้", conversationId);
      expect(reviewed.diagnostics.toolCalls.some((call) => call.toolName === "reviewTripDraft")).toBe(true);
      const beforeMove = await readDraft();
      expect(beforeMove.revision).toBe(draft.revision);

      if (beforeMove.days[0].items.length > 1) {
        const ambiguous = await chat("ย้ายกิจกรรมจากวันที่ 1 ไปวันที่ 2", conversationId);
        const unchanged = await readDraft();
        console.log(JSON.stringify({ phase: "ambiguous_move", tools: ambiguous.diagnostics.toolCalls.map((call) => ({ name: call.toolName, status: call.output?.status })), revision: unchanged.revision }));
        expect(unchanged).toEqual(beforeMove);
      }

      if (beforeMove.days[0].items.length > 0) {
        const sourcePosition = beforeMove.days[0].items.length > 1 ? 2 : 1;
        const activity = beforeMove.days[0].items[sourcePosition - 1];
        const moved = await chat(`ย้ายกิจกรรม ${activity} จากวันที่ 1 ไปวันที่ 2`, conversationId);
        draft = await readDraft();
        console.log(JSON.stringify({ phase: "move", tools: moved.diagnostics.toolCalls.map((call) => ({ name: call.toolName, status: call.output?.status })), beforeRevision: beforeMove.revision, afterRevision: draft.revision, beforeDays: beforeMove.days.map((day) => day.items), afterDays: draft.days.map((day) => day.items) }));
        expect(draft.revision).toBeGreaterThan(beforeMove.revision);
        expect(draft.days[0].items.length).toBe(beforeMove.days[0].items.length - 1);
        expect(draft.days[1].items).toContain(activity);
      }

      await chat("อุทยานแห่งชาติดอยอินทนนท์อยู่จังหวัดอะไร", conversationId);
      const afterUnrelated = await readDraft();
      expect(afterUnrelated).toEqual(draft);

      const foreign = await jsonRequest(`/api/v2/assistant/trip-draft?conversationId=${conversationId}`, secondCookie);
      console.log(JSON.stringify({ phase: "foreign_conversation", http: foreign.status, error: foreign.json.error?.code }));
      expect(foreign.status).toBe(404);

      const beforeCount = await prisma.trip.count({ where: { userId: firstUserId } });
      const unconfirmed = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "POST", { conversationId, draftId: draft.draftId, revision: draft.revision, confirmed: false, travelDetails });
      const invalidCoordinates = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "POST", { conversationId, draftId: draft.draftId, revision: draft.revision, confirmed: true, travelDetails: { originLat: 999, originLng: 100, originText: "invalid" } });
      const stale = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "POST", { conversationId, draftId: draft.draftId, revision: draft.revision + 1, confirmed: true, travelDetails });
      console.log(JSON.stringify({ phase: "save_negative", unconfirmed: unconfirmed.status, invalidCoordinates: invalidCoordinates.status, stale: stale.status }));
      expect([unconfirmed.status, invalidCoordinates.status, stale.status]).toEqual([422, 422, 409]);
      expect(await prisma.trip.count({ where: { userId: firstUserId } })).toBe(beforeCount);

      const saved = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "POST", { conversationId, draftId: draft.draftId, revision: draft.revision, confirmed: true, travelDetails });
      console.log(JSON.stringify({ phase: "save", http: saved.status, tripId: saved.json.data?.id, days: saved.json.data?.itineraryDays?.length }));
      expect(saved.status).toBe(201);
      const tripId = saved.json.data.id as string;
      const repeated = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "POST", { conversationId, draftId: draft.draftId, revision: draft.revision, confirmed: true, travelDetails });
      expect(repeated.status).toBe(200);
      expect(repeated.json.data.id).toBe(tripId);
      expect(await prisma.trip.count({ where: { aiDraftId: draft.draftId } })).toBe(1);

      const record = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { itineraryDays: { orderBy: { dayNumber: "asc" }, include: { items: { orderBy: { position: "asc" } } } } } });
      expect(record.itineraryDays.map((day) => day.items.map((item) => item.name))).toEqual(draft.days.map((day) => day.items));
      expect(record.weatherCondition).toBe(travelDetails.weatherCondition);
      expect(record.estimatedTravelMinutes).toBe(travelDetails.estimatedTravelMinutes);
      expect(record.mockSunsetTime).toBeNull();
      expect(await prisma.weatherSnapshot.count({ where: { tripId } })).toBe(0);
      expect(await prisma.routeSnapshot.count({ where: { tripId } })).toBe(0);
      const listed = await jsonRequest("/api/v1/trips", firstCookie);
      const detail = await jsonRequest(`/api/v1/trips/${tripId}`, firstCookie);
      const foreignTrip = await jsonRequest(`/api/v1/trips/${tripId}`, secondCookie);
      console.log(JSON.stringify({ phase: "saved_read", listHttp: listed.status, detailHttp: detail.status, foreignHttp: foreignTrip.status, tripId }));
      expect(listed.json.data.some((item: { id: string }) => item.id === tripId)).toBe(true);
      expect(detail.json.data.itineraryDays.map((day: { items: Array<{ name: string }> }) => day.items.map((item) => item.name))).toEqual(draft.days.map((day) => day.items));
      expect(foreignTrip.status).toBe(403);

      const discardSaved = await jsonRequest("/api/v2/assistant/trip-draft", firstCookie, "DELETE", { conversationId, draftId: draft.draftId, revision: draft.revision, confirmed: true });
      expect(discardSaved.status).toBe(409);
      expect(await prisma.trip.count({ where: { id: tripId } })).toBe(1);

    } finally {
      if (firstCreated) {
        await prisma.trip.deleteMany({ where: { userId: firstUserId } });
        await prisma.userSession.deleteMany({ where: { userId: firstUserId } });
        await prisma.user.delete({ where: { id: firstUserId } });
      }
      if (secondCreated) {
        await prisma.userSession.deleteMany({ where: { userId: secondUserId } });
        await prisma.user.delete({ where: { id: secondUserId } });
      }
    }
  }, 600000);
});
