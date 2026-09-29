import type {
  AssistantContext,
  ParkReference,
} from "@/lib/chat/shared/contracts";
import { isParkInformationFollowUp } from "./query-signals";

export type ReferenceResolution = {
  parks: ParkReference[];
  unresolved: boolean;
};

function sourceParks(context: AssistantContext): ParkReference[] {
  return [
    context.lastParkResults,
    context.lastRecommendedParks,
    context.lastComparedParks,
  ].find((parks) => parks && parks.length > 0) ?? [];
}

export function resolveParkReferences(
  message: string,
  context: AssistantContext,
): ReferenceResolution {
  const query = message.normalize("NFC").replace(/\s+/g, "");
  const parks = sourceParks(context);
  const latestContext = context.lastParkResults?.length
    ? context.lastParkResults
    : context.selectedPark
      ? [context.selectedPark]
      : parks;

  if (/สองที่แรก|สองอันแรก|ทั้งสองที่|สองที่นี้/.test(query)) {
    return { parks: parks.slice(0, 2), unresolved: parks.length < 2 };
  }
  if (/ที่แรก|อันแรก|ตัวแรก/.test(query)) {
    return { parks: parks.slice(0, 1), unresolved: parks.length < 1 };
  }
  if (/ที่สอง|อันที่สอง|อันสอง/.test(query)) {
    return { parks: parks.slice(1, 2), unresolved: parks.length < 2 };
  }
  if (/ที่สาม|อันที่สาม|อันสาม/.test(query)) {
    return { parks: parks.slice(2, 3), unresolved: parks.length < 3 };
  }
  if (/ที่เมื่อกี้|อันก่อนหน้า|อันนั้น|ที่นี่/.test(query)) {
    return {
      parks: latestContext.length === 1 ? latestContext : [],
      unresolved: latestContext.length !== 1,
    };
  }
  if (isParkInformationFollowUp(message) && latestContext.length > 0) {
    return {
      parks: latestContext.length === 1 ? latestContext : [],
      unresolved: latestContext.length !== 1,
    };
  }

  return { parks: [], unresolved: false };
}
