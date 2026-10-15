import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";

type Fetcher = typeof fetch;

export async function readAssistantTripDraft(
  conversationId: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<AssistantV2DraftTrip | null> {
  const response = await fetcher(
    `/api/v2/assistant/trip-draft?conversationId=${encodeURIComponent(conversationId)}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Draft refresh failed (${response.status})`);
  const body = await response.json();
  return body.data ?? null;
}

export async function submitAssistantDraftMutation(
  method: "PATCH" | "DELETE" | "POST",
  payload: { conversationId: string; draftId: string; revision: number; [key: string]: unknown },
  fetcher: Fetcher = fetch,
): Promise<
  | { status: "OK"; data: unknown }
  | { status: "CONFLICT"; draft: AssistantV2DraftTrip | null | undefined }
  | { status: "ERROR"; message: string }
> {
  const response = await fetcher("/api/v2/assistant/trip-draft", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (response.status === 409) {
    try {
      return { status: "CONFLICT", draft: await readAssistantTripDraft(payload.conversationId, undefined, fetcher) };
    } catch {
      return { status: "CONFLICT", draft: undefined };
    }
  }
  if (!response.ok) {
    const details = body.error?.details;
    const field = Array.isArray(details)
      ? details.map((item: { message: string }) => item.message).join("; ")
      : "";
    return { status: "ERROR", message: field || `ไม่สำเร็จ (${body.error?.code ?? response.status}) กรุณาตรวจข้อมูลแล้วลองอีกครั้ง` };
  }
  return { status: "OK", data: body.data };
}
