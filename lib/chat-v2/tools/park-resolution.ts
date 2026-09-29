import {
  findMentionedParks,
  type ParkCatalogEntry,
} from "@/lib/chat/core/park-catalog";
import type { ParkResolutionFailure, ParkSummary } from "@/lib/chat-v2/shared/contracts";

export type ParkResolver = (query: string) => ParkCatalogEntry[];

export function toParkSummary(park: ParkCatalogEntry): ParkSummary {
  return {
    id: park.id,
    slug: park.slug,
    name: park.name,
    provinces: [...park.provinces],
  };
}

export function resolveSinglePark(
  parkName: string,
  resolver: ParkResolver = findMentionedParks,
): { found: true; park: ParkCatalogEntry } | ParkResolutionFailure {
  const matches = resolver(parkName);

  if (matches.length === 1) {
    return { found: true, park: matches[0] };
  }

  return {
    found: false,
    ambiguous: matches.length > 1,
    parkName,
    candidates: matches.map(toParkSummary),
  };
}
