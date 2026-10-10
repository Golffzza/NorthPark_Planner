//* ./lib/evaluation/evaluate-hard-constraints.ts

import type { EvaluationConstraint } from "./types";
import { getTripTimeline } from "./trip-timeline";
import type { TripEvaluationInput } from "./types";

type HardConstraintInput = Pick<TripEvaluationInput,
  "tripDate" | "timeZone" | "departAt" | "estimatedTravelMinutes" | "parkCloseTime">;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function evaluateHardConstraints(
  input: HardConstraintInput,
): EvaluationConstraint[] {
  const arrivalMinutes = getTripTimeline(input).arrivalMinutes;

  const closeMinutes = toMinutes(
    input.parkCloseTime,
  );

  const constraints: EvaluationConstraint[] = [];

  if (arrivalMinutes > closeMinutes) {
    constraints.push({
      code: "ARRIVAL_AFTER_PARK_CLOSE",
      severity: "WARNING",
      message:
        "คาดว่าจะถึงหลังเวลาที่ระบุในข้อมูลเวลาเปิดให้ท่องเที่ยว ควรตรวจสอบการเข้าถึงกับอุทยานก่อนเดินทาง",
    });
  }

  return constraints;
}
