import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import type { ParkReference } from "@/lib/chat/shared/contracts";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

/**
 * Record a single explicitly recommended park, not every park mentioned in a
 * comparison. Only the final answer shown to the user is admissible evidence.
 */
export function reconcileRecommendedPark(
  state: AssistantV2ConversationState,
  userMessage: string,
  assistantAnswer: string,
): void {
  state.recommendedPark = undefined;
  if (!/(?:เลือก|แนะนำ).*(?:แห่งเดียว|ที่เดียว|อันเดียว|เหมาะที่สุด|ดีที่สุด)|(?:แห่งเดียว|ที่เดียว).*(?:เลือก|แนะนำ)/.test(userMessage)) return;

  // Inspect recommendation statements rather than general park mentions,
  // numbered alternatives, or the automatic Facebook/link attribution.
  const prose = assistantAnswer.split(/เพจ Facebook ทางการ|ข้อมูลอุทยานที่กล่าวถึง/)[0];
  const recommendationSentences = prose.split(/[\n。！？!?]/)
    .filter((part) => /(?:ขอแนะนำ|แนะนำให้เลือก|แนะนำ\s*อุทยาน|เหมาะที่สุดคือ)/.test(part));

  const candidates = state.currentResults;
  const matched: ParkReference[] = [];
  for (const sentence of recommendationSentences) {
    const afterRecommendation = sentence.split(/(?:ขอแนะนำ|แนะนำให้เลือก|แนะนำ\s*|เหมาะที่สุดคือ)/).slice(1).join(" ");
    const named = findMentionedParks(afterRecommendation);
    if (named.length !== 1) continue;
    const park = candidates.find((candidate) => candidate.slug === named[0].slug);
    if (park && !matched.some((candidate) => candidate.slug === park.slug)) matched.push(park);
  }
  if (matched.length === 1) state.recommendedPark = { ...matched[0] };
}
