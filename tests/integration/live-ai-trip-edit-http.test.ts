import { describe, expect, it } from "vitest";

import { getSessionCookieName, issueUserSession } from "@/lib/auth/session-service";
import { prisma } from "@/lib/db/prisma";

const baseUrl = process.env.LIVE_AI_TRIP_BASE_URL ?? "http://localhost:3001";

async function request(path: string, cookie: string, method = "GET", body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(115000),
  });
  return { status: response.status, json: await response.json() };
}

describe.skipIf(process.env.RUN_LIVE_AI_TRIP !== "1")("live authenticated draft editing", () => {
  it("adds and removes a verified activity through the HTTP API, then discards only the unsaved draft", async () => {
    const userId = crypto.randomUUID();
    await prisma.user.create({ data: { id: userId, displayName: "AI trip edit HTTP test" } });
    try {
      const cookie = `${getSessionCookieName()}=${await issueUserSession(userId)}`;
      const chat = await request("/api/v2/assistant/chat", cookie, "POST", {
        message: "ช่วยจัดทริป 2 วันสำหรับอุทยานแห่งชาติลานสาง",
      });
      console.log(JSON.stringify({ phase: "edit_setup_gemini", http: chat.status, tools: chat.json.data?.diagnostics?.toolCalls?.map((call: { toolName: string; output?: { status?: string } }) => ({ name: call.toolName, status: call.output?.status })) ?? [] }));
      expect(chat.status).toBe(200);
      const conversationId = chat.json.data.conversationId as string;
      const getDraft = async () => {
        const response = await request(`/api/v2/assistant/trip-draft?conversationId=${conversationId}`, cookie);
        expect(response.status).toBe(200);
        return response.json.data as { draftId: string; revision: number; days: Array<{ items: string[] }>; verifiedActivities: Array<{ name: string; sourceReference: string }> };
      };
      let before = await getDraft();
      const targetDay = 2;
      const candidate = before.verifiedActivities.find((item) => !before.days[targetDay - 1].items.includes(item.name));
      expect(candidate?.sourceReference).toBeTruthy();
      const invalidActivity = await request("/api/v2/assistant/trip-draft", cookie, "PATCH", {
        conversationId, draftId: before.draftId, revision: before.revision,
        edit: { operation: "ADD_ACTIVITY", day: 1, activityName: "กิจกรรมที่ไม่มีหลักฐาน" },
      });
      const invalidDay = await request("/api/v2/assistant/trip-draft", cookie, "PATCH", {
        conversationId, draftId: before.draftId, revision: before.revision,
        edit: { operation: "REMOVE_ACTIVITY", day: 99, position: 1 },
      });
      expect([invalidActivity.status, invalidDay.status]).toEqual([422, 422]);
      expect(await getDraft()).toEqual(before);
      const geminiAdd = await request("/api/v2/assistant/chat", cookie, "POST", { conversationId, message: `เพิ่มกิจกรรม ${candidate!.name} ในวันที่ 2` });
      const afterGeminiAdd = await getDraft();
      console.log(JSON.stringify({ phase: "gemini_add", http: geminiAdd.status, tools: geminiAdd.json.data?.diagnostics?.toolCalls?.map((call: { toolName: string; output?: { status?: string } }) => ({ name: call.toolName, status: call.output?.status })) ?? [], revisions: [before.revision, afterGeminiAdd.revision] }));
      expect(geminiAdd.status).toBe(200);
      expect(afterGeminiAdd.revision).toBe(before.revision + 1);
      expect(afterGeminiAdd.days[targetDay - 1].items).toContain(candidate!.name);
      const geminiRemove = await request("/api/v2/assistant/chat", cookie, "POST", { conversationId, message: `ลบกิจกรรม ${candidate!.name} ออกจากวันที่ 2` });
      const afterGeminiRemove = await getDraft();
      console.log(JSON.stringify({ phase: "gemini_remove", http: geminiRemove.status, answer: geminiRemove.json.data?.message, tools: geminiRemove.json.data?.diagnostics?.toolCalls?.map((call: { toolName: string; input?: unknown; output?: { status?: string } }) => ({ name: call.toolName, input: call.input, status: call.output?.status })) ?? [], revisions: [afterGeminiAdd.revision, afterGeminiRemove.revision] }));
      expect(geminiRemove.status).toBe(200);
      expect(afterGeminiRemove.revision).toBe(afterGeminiAdd.revision + 1);
      expect(afterGeminiRemove.days).toEqual(before.days);
      before = afterGeminiRemove;
      const add = await request("/api/v2/assistant/trip-draft", cookie, "PATCH", {
        conversationId, draftId: before.draftId, revision: before.revision,
        edit: { operation: "ADD_ACTIVITY", day: targetDay, activityName: candidate!.name },
      });
      expect(add.status).toBe(200);
      const afterAdd = await getDraft();
      expect(afterAdd.revision).toBe(before.revision + 1);
      expect(afterAdd.days[targetDay - 1].items).toContain(candidate!.name);
      const position = afterAdd.days[targetDay - 1].items.indexOf(candidate!.name) + 1;
      const remove = await request("/api/v2/assistant/trip-draft", cookie, "PATCH", {
        conversationId, draftId: before.draftId, revision: afterAdd.revision,
        edit: { operation: "REMOVE_ACTIVITY", day: targetDay, position },
      });
      expect(remove.status).toBe(200);
      const afterRemove = await getDraft();
      expect(afterRemove.revision).toBe(afterAdd.revision + 1);
      expect(afterRemove.days).toEqual(before.days);
      const discard = await request("/api/v2/assistant/trip-draft", cookie, "DELETE", {
        conversationId, draftId: before.draftId, revision: afterRemove.revision, confirmed: true,
      });
      expect(discard.status).toBe(200);
      expect(await getDraft()).toBeNull();
      expect(await prisma.trip.count({ where: { userId } })).toBe(0);
      console.log(JSON.stringify({ phase: "edit_http", add: add.status, remove: remove.status, discard: discard.status, revisions: [before.revision, afterAdd.revision, afterRemove.revision] }));
    } finally {
      await prisma.trip.deleteMany({ where: { userId } });
      await prisma.userSession.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  }, 180000);
});
