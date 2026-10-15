// ./lib/chat-v2/application/displayed-park-results.ts

import type { ParkReference } from "@/lib/chat/shared/contracts";
import { setInformationParks, type AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

const LIST_TOOLS = new Set(["recommendParks", "searchParks", "findNearbyParks", "compareParks"]);

function normalizeName(value: string): string {
  return value
    .replace(/\*\*|__/g, "")
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[\s\u200b\-–—]/g, "");
}

function displayedList(message: string, candidates: ParkReference[]): ParkReference[] | undefined {
  const numberedRows: Array<{ number: number; body: string }> = [];
  const bulletRows: Array<{ body: string }> = [];

  for (const line of message.split(/\r?\n/)) {
    const numbered = line.match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(\d+)[.)．、](?:\*\*)?\s+(.+)$/);
    if (numbered) {
      numberedRows.push({ number: Number(numbered[1]), body: numbered[2] });
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) bulletRows.push({ body: bullet[1] });
  }

  // Numbered parks often include bullet points describing each park.
  const rows = numberedRows.length ? numberedRows : bulletRows;
  if (!rows.length) return undefined;

  if (numberedRows.length && numberedRows.some((row, index) => row.number !== index + 1)) {
    return undefined;
  }

  const matched: ParkReference[] = [];
  for (const row of rows) {
    const body = normalizeName(row.body);
    const matches = candidates.filter((park) => {
      const fullName = normalizeName(park.name);
      const shortName = fullName.replace(/^อุทยานแห่งชาติ/, "");
      return body.startsWith(fullName) || (shortName.length > 0 && body.startsWith(shortName));
    });
    if (matches.length !== 1 || matched.some((park) => park.id === matches[0].id)) {
      return undefined;
    }
    matched.push(matches[0]);
  }

  return matched;
}

/** Reconcile the candidates with the final text sent to the client, not the tool ranking. */
export function reconcileDisplayedParkResults(
  state: AssistantV2ConversationState,
  finalMessage: string,
  toolNames: string[],
  toolInputs: unknown[] = [],
): void {
  const lastListIndex = toolNames.findLastIndex((name) => LIST_TOOLS.has(name));
  const lastListTool = toolNames[lastListIndex];
  if (!lastListTool) return;
  const input = toolInputs[lastListIndex];
  if (lastListTool === "searchParks" && input && typeof input === "object"
    && "operation" in input && input.operation === "COUNT") return;

  const candidates = lastListTool === "compareParks"
    ? state.lastComparedParks
    : state.currentResults;
  const displayed = displayedList(finalMessage, candidates);

  // Keep candidates for explicit name selection, but never trust their raw order.
  state.currentResults = (displayed ?? candidates).map((park) => ({ ...park }));
  state.currentResultsOrderVerified = Boolean(displayed);
  if (displayed && toolNames[toolNames.length - 1] === lastListTool) {
    setInformationParks(state, displayed);
  }
}
