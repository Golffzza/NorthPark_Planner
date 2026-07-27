import type { RecommendationContext } from "./types";

export function buildRecommendations(context: RecommendationContext): string {
  switch (context.weakestFactor) {
    case "weather":
      return `Weather conditions are the main concern. Consider changing the travel date or waiting for calmer weather before visiting the park.`;
    case "duration":
      return `Travel duration is the weakest factor. Consider leaving from a closer origin, departing earlier, or planning an overnight stay nearby.`;
    case "time":
      return `Time suitability is the weakest factor. Consider departing earlier so your arrival is not too close to sunset or park closing time.`;
    case "userProfile":
      return `Traveler profile is the weakest factor. Consider using a safer transport mode or traveling with more companions for better support.`;
  }
}
