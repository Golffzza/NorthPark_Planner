import { describe, expect, it, vi } from "vitest";
import { readAssistantTripDraft, submitAssistantDraftMutation } from "@/components/assistant/trip-draft-requests";

const draft = {
  draftId: "draft-1", revision: 2,
  park: { id: "lan-sang", slug: "lan-sang", name: "ลานสาง" },
  durationDays: 2, companions: [], activities: [], days: [],
};
const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body,
}) as Response;

describe("trip draft UI requests", () => {
  it("reads the authoritative draft from the existing GET endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, { data: draft }));
    expect(await readAssistantTripDraft("conversation-1", undefined, fetcher)).toEqual(draft);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v2/assistant/trip-draft?conversationId=conversation-1", { signal: undefined },
    );
  });

  it("refreshes after HTTP 409 without retrying a stale edit", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(409, { error: { code: "stale_draft" } }))
      .mockResolvedValueOnce(response(200, { data: draft }));
    const result = await submitAssistantDraftMutation("PATCH", {
      conversationId: "conversation-1", draftId: "draft-1", revision: 1,
      edit: { operation: "SET_DURATION", durationDays: 3 },
    }, fetcher);
    expect(result).toEqual({ status: "CONFLICT", draft });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toContain("?conversationId=conversation-1");
  });

  it("keeps conflict visible if refresh fails", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(409, { error: { code: "stale_draft" } }))
      .mockResolvedValueOnce(response(500, { error: { code: "internal_error" } }));
    expect(await submitAssistantDraftMutation("DELETE", {
      conversationId: "conversation-1", draftId: "draft-1", revision: 1, confirmed: true,
    }, fetcher)).toEqual({ status: "CONFLICT", draft: undefined });
  });

  it("distinguishes a deleted draft from a failed refresh", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(409, { error: { code: "stale_draft" } }))
      .mockResolvedValueOnce(response(200, { data: null }));
    expect(await submitAssistantDraftMutation("PATCH", {
      conversationId: "conversation-1", draftId: "draft-1", revision: 1,
      edit: { operation: "SET_DURATION", durationDays: 3 },
    }, fetcher)).toEqual({ status: "CONFLICT", draft: null });
  });
});
