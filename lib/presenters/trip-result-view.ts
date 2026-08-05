import type { TripDetailDto } from "@/lib/mappers/trip-dto";

export type FactorScoreKey = "weather" | "duration" | "time" | "userProfile";

export type FactorScoreViewModel = {
  key: FactorScoreKey;
  label: string;
  weightLabel: string;
  description: string;
  score: number;
};

export type EvaluationHistoryItem = {
  id: string;
  totalScore: number;
  level: string;
  summary: string;
  evaluatedAt: string;
  isLatest: boolean;
};

export type TripResultViewModel = {
  tripId: string;
  parkName: string;
  parkProvince: string;
  latestEvaluation: TripDetailDto["evaluations"][number];
  factorScores: FactorScoreViewModel[];
  recommendations: string[];
  history: EvaluationHistoryItem[];
};

const FACTOR_METADATA: Array<{
  key: FactorScoreKey;
  label: string;
  weightLabel: string;
  description: string;
}> = [
  {
    key: "weather",
    label: "สภาพอากาศ (Weather)",
    weightLabel: "น้ำหนัก 35%",
    description: "ประเมินจากปริมาณฝน สภาพอากาศเปิด และโอกาสเกิดพายุตามข้อมูลสภาพอากาศล่าสุด",
  },
  {
    key: "duration",
    label: "ระยะเวลาเดินทาง (Duration)",
    weightLabel: "น้ำหนัก 25%",
    description: "ประเมินจากระยะทางและเวลาขับขี่เพื่อป้องกันความเหนื่อยล้าในการเดินทาง",
  },
  {
    key: "time",
    label: "เวลาเดินทางและแสงอาทิตย์ (Time)",
    weightLabel: "น้ำหนัก 20%",
    description: "ประเมินเวลาออกเดินทางเทียบกับเวลาเปิด-ปิดอุทยานและช่วงเวลาพระอาทิตย์ตก",
  },
  {
    key: "userProfile",
    label: "ปัจจัยส่วนบุคคล (User Profile)",
    weightLabel: "น้ำหนัก 20%",
    description: "ประเมินความเหมาะสมจากจำนวนผู้ร่วมเดินทางและประเภทพาหนะที่ใช้",
  },
];

function extractRecommendations(recommendation: string): string[] {
  return recommendation
    .split(/\r?\n+/)
    .map((item) => item.replace(/^[-*\u2022\s]+/, "").trim())
    .filter(Boolean);
}

export function buildTripResultViewModel(trip: TripDetailDto): TripResultViewModel {
  const latestEvaluation = trip.evaluations[0];

  if (!latestEvaluation) {
    throw new Error("Trip evaluation is required to build result view model");
  }

  const factorScoreMap: Record<FactorScoreKey, number> = {
    weather: latestEvaluation.weatherScore,
    duration: latestEvaluation.durationScore,
    time: latestEvaluation.timeScore,
    userProfile: latestEvaluation.userProfileScore,
  };

  return {
    tripId: trip.id,
    parkName: trip.park.nameTh,
    parkProvince: trip.park.province,
    latestEvaluation,
    factorScores: FACTOR_METADATA.map((factor) => ({
      ...factor,
      score: factorScoreMap[factor.key],
    })),
    recommendations: extractRecommendations(latestEvaluation.recommendation),
    history: trip.evaluations.map((evaluation, index) => ({
      id: evaluation.id,
      totalScore: evaluation.totalScore,
      level: evaluation.level,
      summary: evaluation.summary,
      evaluatedAt: evaluation.evaluatedAt,
      isLatest: index === 0,
    })),
  };
}
