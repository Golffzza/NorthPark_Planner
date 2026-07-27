export const evaluationRules = [
  {
    key: "weather_weight",
    value: "0.35",
    description: "Weight for weather condition in the Phase 1 suitability score.",
  },
  {
    key: "duration_weight",
    value: "0.25",
    description: "Weight for estimated travel duration in the Phase 1 suitability score.",
  },
  {
    key: "time_weight",
    value: "0.20",
    description: "Weight for time suitability in the Phase 1 suitability score.",
  },
  {
    key: "user_profile_weight",
    value: "0.20",
    description: "Weight for traveler profile and transport mode in the Phase 1 suitability score.",
  },
];
