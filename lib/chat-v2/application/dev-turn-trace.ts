import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

type ToolOutcome = { toolName: string; output: unknown };
type StateSnapshot = {
  selectedPark?: string;
  recommendedPark?: string;
  activePark?: string;
  informationParkCount: number;
  displayedParkCount: number;
  displayedOrderVerified: boolean;
  draftPark?: string;
};

export function snapshotAssistantV2Context(state: AssistantV2ConversationState): StateSnapshot {
  return {
    selectedPark: state.selectedPark?.slug,
    recommendedPark: state.recommendedPark?.slug,
    activePark: state.activePark?.slug,
    informationParkCount: state.informationParks?.length ?? 0,
    displayedParkCount: state.currentResults.length,
    displayedOrderVerified: state.currentResultsOrderVerified === true,
    draftPark: state.draftTrip?.park.slug,
  };
}

/** Opt-in, non-production diagnostics: never log raw user messages, inputs or provider payloads. */
export function traceAssistantV2Turn(
  phase: "before" | "after",
  snapshot: StateSnapshot,
  outcomes: ToolOutcome[] = [],
): void {
  if (process.env.NODE_ENV === "production" || process.env.ASSISTANT_V2_TRACE !== "1") return;
  const tools = outcomes.map(({ toolName, output }) => {
    const status = output && typeof output === "object" && "status" in output
      && typeof output.status === "string" ? output.status
      : output && typeof output === "object" && "selected" in output
        ? output.selected === true ? "SELECTED" : "NOT_SELECTED"
        : "UNKNOWN";
    return { toolName, status };
  });
  console.info("[assistant-v2/context-trace]", { phase, state: snapshot, tools });
}
