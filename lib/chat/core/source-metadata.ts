// ./lib/chat/core/source-metadata.ts

import sourceRegistry from "@/data/knowledge/source-registry.json";

import type { AssistantSource } from "@/lib/chat/shared/contracts";
import type { ParkCatalogEntry } from "./park-catalog";

type EvidenceReference = {
  parkSlug: string;
  sourceIds: string[];
};

export function sourcesForEvidence(
  evidence: EvidenceReference[],
): AssistantSource[] {
  const requested = new Set(
    evidence.flatMap(({ parkSlug, sourceIds }) =>
      sourceIds.map((sourceId) => `${parkSlug}:${sourceId}`),
    ),
  );
  const sources = sourceRegistry
    .filter((source) => requested.has(`${source.parkSlug}:${source.sourceId}`))
    .map((source) => ({
      id: `${source.parkSlug}:${source.sourceId}`,
      title: source.title,
      ...(source.url ? { url: source.url } : {}),
      sourceType: source.publisher,
    }));

  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

export function sourcesForCatalogParks(
  parks: ParkCatalogEntry[],
): AssistantSource[] {
  return parks.map((park) => ({
    id: `knowledge-index:${park.slug}`,
    title: `ฐานข้อมูล NorthPark: ${park.name}`,
    sourceType: "KNOWLEDGE_INDEX",
  }));
}
