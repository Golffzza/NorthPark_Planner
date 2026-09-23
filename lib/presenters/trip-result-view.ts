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

const LEVEL_THAI_MAP: Record<string, string> = {
  EXCELLENT: "เหมาะสมมาก",
  GOOD: "เหมาะสม",
  MODERATE: "ปานกลาง",
  NEEDS_ADJUSTMENT: "ควรปรับแผน",
};

export function localizeEvaluationSummary(summary: string, level?: string): string {
  if (!summary) return "";
  if (!summary.toLowerCase().startsWith("trip suitability is")) {
    return summary;
  }
  const levelText = (level && LEVEL_THAI_MAP[level]) || "ปานกลาง";
  let factorText = "สภาพอากาศ";
  if (summary.includes("weather")) factorText = "สภาพอากาศ";
  else if (summary.includes("duration")) factorText = "ระยะเวลาเดินทาง";
  else if (summary.includes("time")) factorText = "ช่วงเวลาเดินทางและแสงอาทิตย์";
  else if (summary.includes("userProfile") || summary.includes("user profile")) factorText = "ความพร้อมของผู้เดินทางและพาหนะ";

  return `ผลการประเมินความเหมาะสมทริปอยู่ในเกณฑ์ "${levelText}" โดยมีปัจจัยด้าน${factorText}ที่ควรให้ความสำคัญหรือปรับแผนมากที่สุด`;
}

export function localizeRecommendation(text: string): string {
  if (text.includes("Weather conditions are the main concern")) {
    return "สภาพอากาศเป็นปัจจัยหลักที่ต้องระวัง ควรตรวจสอบพยากรณ์อากาศล่วงหน้าหรือรอช่วงสภาพอากาศแจ่มใสก่อนออกเดินทาง";
  }
  if (text.includes("Travel duration is the weakest factor")) {
    return "ระยะเวลาเดินทางค่อนข้างนาน อาจทำให้เหนื่อยล้า ควรวางแผนจุดพักรถ ออกเดินทางให้เช้าขึ้น หรือแวะพักค้างคืนระหว่างทาง";
  }
  if (text.includes("Time suitability is the weakest factor")) {
    return "เวลาเดินทางและแสงอาทิตย์เป็นปัจจัยที่ควรปรับปรุง ควรออกเดินทางให้เช้าขึ้นเพื่อหลีกเลี่ยงการเดินทางถึงอุทยานใกล้ค่ำหรือหลังเวลาปิดทำการ";
  }
  if (text.includes("Traveler profile is the weakest factor")) {
    return "ความพร้อมของผู้เดินทางและพาหนะควรได้รับการดูแล แนะนำเดินทางเป็นกลุ่มหรือเลือกใช้ยานพาหนะที่มีความปลอดภัยสูงขึ้น";
  }
  return text;
}

function extractRecommendations(recommendation: string): string[] {
  return recommendation
    .split(/\r?\n+/)
    .map((item) => localizeRecommendation(item.replace(/^[-*\u2022\s]+/, "").trim()))
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
    latestEvaluation: {
      ...latestEvaluation,
      summary: localizeEvaluationSummary(latestEvaluation.summary, latestEvaluation.level),
      recommendation: localizeRecommendation(latestEvaluation.recommendation),
    },
    factorScores: FACTOR_METADATA.map((factor) => ({
      ...factor,
      score: factorScoreMap[factor.key],
    })),
    recommendations: extractRecommendations(latestEvaluation.recommendation),
    history: trip.evaluations.map((evaluation, index) => ({
      id: evaluation.id,
      totalScore: evaluation.totalScore,
      level: evaluation.level,
      summary: localizeEvaluationSummary(evaluation.summary, evaluation.level),
      evaluatedAt: evaluation.evaluatedAt,
      isLatest: index === 0,
    })),
  };
}
