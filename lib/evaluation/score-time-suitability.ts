import { DEFAULT_MOCK_SUNSET_TIME } from "./constants";

type TimeSuitabilityInput = {
  departAt: string;
  estimatedTravelMinutes: number;
  mockSunsetTime?: string;
  parkOpenTime: string;
  parkCloseTime: string;
};

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function scoreTimeSuitability(input: TimeSuitabilityInput): number {
  const departMinutes = toMinutes(input.departAt);
  const openMinutes = toMinutes(input.parkOpenTime);
  const closeMinutes = toMinutes(input.parkCloseTime);
  const sunsetMinutes = toMinutes(input.mockSunsetTime ?? DEFAULT_MOCK_SUNSET_TIME);
  const arrivalMinutes = departMinutes + input.estimatedTravelMinutes;

  if (arrivalMinutes > closeMinutes) return 15;
  if (arrivalMinutes > sunsetMinutes) return 20;
  if (arrivalMinutes >= sunsetMinutes - 60) return 35;
  if (arrivalMinutes >= sunsetMinutes - 120) return 55;
  if (departMinutes < openMinutes - 60) return 60;
  if (departMinutes < openMinutes) return 75;

  return 90;
}
