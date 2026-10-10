//* ./lib/evaluation/types.ts

export type WeatherCondition =
  | "CLEAR"
  | "CLOUDY"
  | "LIGHT_RAIN"
  | "HEAVY_RAIN"
  | "STORM";

export type TransportMode =
  | "CAR"
  | "MOTORCYCLE"
  | "PUBLIC_TRANSPORT"
  | "OTHER";

export type EvaluationLevel =
  | "EXCELLENT"
  | "GOOD"
  | "MODERATE"
  | "NEEDS_ADJUSTMENT";

/**
 * เก็บชื่อ userProfile ไว้ก่อนเพื่อ compatibility
 * กับ frontend / tests / database เดิม
 *
 * แต่ใน logic ปัจจุบันหมายถึงความเหมาะสม
 * ด้านพาหนะและการเข้าถึง ไม่ใช่จำนวนผู้เดินทาง
 */
export type WeakestFactor =
  | "weather"
  | "duration"
  | "time"
  | "userProfile";

export type FactorStatus =
  | "GOOD"
  | "CAUTION"
  | "RISK";

export type FactorEvaluation = {
  score: number;
  status: FactorStatus;
  reason: string;
};

export type EvaluationConstraintSeverity =
  | "BLOCKING"
  | "WARNING";

export type EvaluationConstraint = {
  code: string;
  severity: EvaluationConstraintSeverity;
  message: string;
};

export type TripEvaluationInput = {
  weatherCondition: WeatherCondition;
  estimatedTravelMinutes: number;

  /** Calendar date of departure; supplied by persisted Trip for real evaluations. */
  tripDate?: Date;
  /** Snapshot timezone for live evaluation; otherwise the app timezone. */
  timeZone?: string;
  /** Exact sunset instant from the bound sunset snapshot. */
  sunsetAt?: Date;

  /**
   * HH:mm
   */
  departAt: string;

  /**
   * ตอนนี้ยังใช้ชื่อเดิมเพื่อ compatibility
   * ในอนาคตควรเปลี่ยนไปใช้ sunset snapshot จริง
   */
  mockSunsetTime?: string;

  /**
   * HH:mm
   */
  parkOpenTime: string;

  /**
   * HH:mm
   */
  parkCloseTime: string;

  /**
   * เก็บไว้ใช้ recommendation
   * แต่ไม่ใช้ในการคำนวณคะแนนแล้ว
   */
  travelerCount: number;

  transportMode: TransportMode;

  /**
   * optional เพราะตอนนี้ dataset ของอุทยาน
   * ยังไม่ได้ยืนยันข้อมูลนี้ครบทุกแห่ง
   */
  hasDirectPublicTransit?: boolean;

  parkName?: string;
};

export type TripEvaluationResult = {
  totalScore: number;
  level: EvaluationLevel;

  /**
   * false เมื่อมี hard constraint ที่ยืนยันได้
   */
  canProceed: boolean;

  /**
   * Legacy score fields
   * เก็บชื่อเดิมไว้เพื่อไม่ให้ระบบส่วนเก่าพัง
   */
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;

  /**
   * รายละเอียดที่หน้า Result และ LLM
   * สามารถใช้เพื่ออธิบายคะแนน
   */
  factors: {
    weather: FactorEvaluation;
    duration: FactorEvaluation;
    time: FactorEvaluation;
    userProfile: FactorEvaluation;
  };

  /**
   * เงื่อนไขที่แยกจาก weighted score
   */
  constraints: EvaluationConstraint[];

  weakestFactor: WeakestFactor;

  summary: string;
  recommendation: string;

  /**
   * เวลาที่ evaluation engine คำนวณผล
   */
  evaluatedAt: string;
};

export type RecommendationContext = Pick<
  TripEvaluationInput,
  | "weatherCondition"
  | "estimatedTravelMinutes"
  | "departAt"
  | "transportMode"
  | "travelerCount"
  | "hasDirectPublicTransit"
  | "parkName"
> & {
  weakestFactor: WeakestFactor;
};
