import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";
import { AssistantV2ConversationExpiredError, assistantV2ConversationStore } from "@/lib/chat-v2/state/conversation-state";
import { editTripDraft, tripDraftEditSchema } from "@/lib/chat-v2/state/trip-draft-edit";
import { InvalidAiTripDraftError, saveAiTripDraft } from "@/lib/services/ai-trip-service";
import { getTripDetailForCurrentUser } from "@/lib/services/trip-service";
import { RequestValidationError } from "@/lib/validations/trip-create";

export const runtime = "nodejs";

const id = z.string().uuid();
const patchSchema = z.object({ conversationId: id, draftId: id, revision: z.number().int().positive(), edit: tripDraftEditSchema }).strict();
const saveSchema = z.object({ conversationId: id, draftId: id, revision: z.number().int().positive(), confirmed: z.literal(true), travelDetails: z.record(z.string(), z.unknown()) }).strict();

const reply = (code: string, status: number, details?: unknown) => NextResponse.json({ error: { code, details } }, { status });

function handleError(error: unknown) {
  if (error instanceof AuthenticationError) return reply("unauthorized", 401);
  if (error instanceof AssistantV2ConversationExpiredError || (error instanceof Error && error.name === "AssistantV2ConversationExpiredError")) return reply("conversation_expired", 404);
  if (error instanceof RequestValidationError) return reply("validation_error", 422, error.details);
  if (error instanceof InvalidAiTripDraftError) return reply("invalid_draft", 409, error.message);
  console.error("[assistant/trip-draft] Unexpected error", error);
  return reply("internal_error", 500);
}

export async function GET(request: Request) {
  try {
    const conversationId = id.safeParse(new URL(request.url).searchParams.get("conversationId"));
    if (!conversationId.success) return reply("validation_error", 422);
    const user = await getCurrentUser();
    return await assistantV2ConversationStore.runTurn(conversationId.data, user.id, async (state) =>
      NextResponse.json({ data: state.draftTrip ?? null }));
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return reply("validation_error", 422, parsed.error.flatten());
    const user = await getCurrentUser();
    return await assistantV2ConversationStore.runTurn(parsed.data.conversationId, user.id, async (state) => {
      const draft = state.draftTrip;
      if (!draft) return reply("no_draft", 404);
      if (draft.draftId !== parsed.data.draftId || draft.revision !== parsed.data.revision) return reply("stale_draft", 409);
      const result = editTripDraft(draft, parsed.data.edit);
      if (result.status !== "OK") return reply(result.status.toLowerCase(), 422);
      state.draftTrip = result.draft;
      return NextResponse.json({ data: result.draft });
    });
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: Request) {
  try {
    const parsed = z.object({ conversationId: id, draftId: id, revision: z.number().int().positive(), confirmed: z.literal(true) }).strict().safeParse(await request.json());
    if (!parsed.success) return reply("validation_error", 422);
    const user = await getCurrentUser();
    return await assistantV2ConversationStore.runTurn(parsed.data.conversationId, user.id, async (state) => {
      const draft = state.draftTrip;
      if (!draft) return reply("no_draft", 404);
      if (draft.savedTripId) return reply("already_saved", 409);
      if (draft.draftId !== parsed.data.draftId || draft.revision !== parsed.data.revision) return reply("stale_draft", 409);
      state.draftTrip = undefined;
      return NextResponse.json({ data: { discarded: true } });
    });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success) return reply("confirmation_or_details_required", 422, parsed.error.flatten());
    const user = await getCurrentUser();
    return await assistantV2ConversationStore.runTurn(parsed.data.conversationId, user.id, async (state) => {
      const draft = state.draftTrip;
      if (!draft) return reply("no_draft", 404);
      if (draft.draftId !== parsed.data.draftId || draft.revision !== parsed.data.revision) return reply("stale_draft", 409);
      if (draft.savedTripId) {
        const trip = await getTripDetailForCurrentUser(draft.savedTripId);
        return NextResponse.json({ data: trip });
      }
      const trip = await saveAiTripDraft(draft, parsed.data.travelDetails);
      state.draftTrip = { ...draft, savedTripId: trip.id };
      return NextResponse.json({ data: trip }, { status: 201 });
    });
  } catch (error) { return handleError(error); }
}
