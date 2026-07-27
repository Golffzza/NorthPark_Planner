export type WeatherCondition =
  | "CLEAR"
  | "CLOUDY"
  | "LIGHT_RAIN"
  | "HEAVY_RAIN"
  | "STORM";

export type TransportMode = "CAR" | "MOTORCYCLE" | "PUBLIC_TRANSPORT" | "OTHER";

export type EvaluationLevel = "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_ADJUSTMENT";

export type WeakestFactor = "weather" | "duration" | "time" | "userProfile";

export type TripEvaluationInput = {
  weatherCondition: WeatherCondition;
  estimatedTravelMinutes: number;
  departAt: string;
  mockSunsetTime?: string;
  parkOpenTime: string;
  parkCloseTime: string;
  travelerCount: number;
  transportMode: TransportMode;
};

export type TripEvaluationResult = {
  totalScore: number;
  level: EvaluationLevel;
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;
  weakestFactor: WeakestFactor;
  summary: string;
  recommendation: string;
};

export type RecommendationContext = Pick<
  TripEvaluationInput,
  "weatherCondition" | "estimatedTravelMinutes" | "departAt" | "transportMode" | "travelerCount"
> & {
  weakestFactor: WeakestFactor;
};

