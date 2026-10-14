export type NearbyAttributionSource = "GEOAPIFY_PLACES" | "OPENSTREETMAP_OVERPASS";

/** Derive visible attribution from actual tool results, never from the model's prose. */
export function nearbyAttributionSource(
  toolResults: readonly { toolName: string; output: unknown }[],
): NearbyAttributionSource | undefined {
  for (const toolResult of toolResults) {
    if (toolResult.toolName !== "findNearbyPlaces") continue;
    const output = toolResult.output;
    if (!output || typeof output !== "object" || !("status" in output) || output.status !== "OK"
      || !("places" in output) || !Array.isArray(output.places) || output.places.length === 0
      || !("meta" in output) || !output.meta || typeof output.meta !== "object"
      || !("source" in output.meta)) continue;
    if (output.meta.source === "GEOAPIFY_PLACES" || output.meta.source === "OPENSTREETMAP_OVERPASS") {
      return output.meta.source;
    }
  }
  return undefined;
}
