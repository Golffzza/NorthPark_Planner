export function scoreDuration(estimatedTravelMinutes: number): number {
  if (estimatedTravelMinutes <= 90) return 95;
  if (estimatedTravelMinutes <= 180) return 80;
  if (estimatedTravelMinutes <= 300) return 60;
  if (estimatedTravelMinutes <= 420) return 40;
  return 20;
}
