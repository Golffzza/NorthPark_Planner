//* ./lib/services/evaluation-service.ts

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { calculateTripEvaluation } from "@/lib/evaluation/calculate-trip-evaluation";

import type {
  TripEvaluationInput,
  TripEvaluationResult,
} from "@/lib/evaluation/types";

import { mapEvaluationToDto } from "@/lib/mappers/evaluation-dto";

import { explainTripEvaluation } from "@/lib/services/evaluation-explainer-service";

import { assertTripCanBeEvaluated, CancelledTripEvaluationError, getTripForCurrentUser, getTripIdForCurrentUser } from "@/lib/services/trip-service";


export type EvaluateTripResult = {
  tripId: string;
  data: ReturnType<typeof mapEvaluationToDto>;
};

export type EvaluateTripDraftInput =
  TripEvaluationInput;

export type EvaluationSnapshotProvenance = {
  weatherSnapshotId?: string | null;
  routeSnapshotId?: string | null;
  sunsetSnapshotId?: string | null;
};

/**
 * Pure evaluation.
 *
 * - ไม่อ่าน DB
 * - ไม่เขียน DB
 * - ไม่เรียก LLM
 *
 * ใช้ Evaluation Engine อย่างเดียว
 */
export function evaluateTripDraft(
  input: EvaluateTripDraftInput,
): TripEvaluationResult {
  return calculateTripEvaluation(input);
}

/**
 * LLM เป็นเพียง explanation layer
 *
 * ถ้า LLM ใช้งานไม่ได้
 * Evaluation หลักต้องยังสามารถบันทึกได้
 */
async function tryExplainEvaluation(
  evaluation: TripEvaluationResult,
): Promise<{
  headline: string | null;
  explanation: string | null;
}> {
  try {
    const result =
      await explainTripEvaluation({
        totalScore:
          evaluation.totalScore,

        level:
          evaluation.level,

        canProceed:
          evaluation.canProceed,

        weatherScore:
          evaluation.weatherScore,

        durationScore:
          evaluation.durationScore,

        timeScore:
          evaluation.timeScore,

        userProfileScore:
          evaluation.userProfileScore,

        factors:
          evaluation.factors,

        constraints:
          evaluation.constraints,

        summary:
          evaluation.summary,

        recommendation:
          evaluation.recommendation,
      });

    return {
      headline: result.headline,
      explanation: result.explanation,
    };
  } catch (error) {
    console.error(
      "[evaluation-explainer] Failed to generate explanation",
      error,
    );

    return {
      headline: null,
      explanation: null,
    };
  }
}

/**
 * Pipeline กลางสำหรับ:
 *
 * Evaluation Engine
 * → LLM Explanation
 * → Save TripEvaluation
 *
 * caller ต้องเตรียม TripEvaluationInput มาแล้ว
 */
export async function evaluateAndSaveTripForCurrentUser(
  tripId: string,
  input: TripEvaluationInput,
  provenance: EvaluationSnapshotProvenance = {},
): Promise<EvaluateTripResult> {
  /**
   * ตรวจ ownership / existence
   */
  const ownedTripId =
    await getTripIdForCurrentUser(tripId);

  /**
   * Deterministic source of truth
   */
  const evaluation =
    evaluateTripDraft(input);

  /**
   * Natural-language explanation
   *
   * ไม่มีสิทธิ์เปลี่ยน:
   * - score
   * - level
   * - canProceed
   * - constraints
   */
  const explanation =
    await tryExplainEvaluation(
      evaluation,
    );

  const savedEvaluation =
    await prisma.$transaction(
      async (tx) => {
        const updatedTrip = await tx.trip.updateMany({
          where: { id: ownedTripId, status: { not: "CANCELLED" } },
          data: { status: "EVALUATED" },
        });
        if (updatedTrip.count !== 1) {
          throw new CancelledTripEvaluationError();
        }

        const createdEvaluation =
          await tx.tripEvaluation.create({
            data: {
              tripId:
                ownedTripId,

              weatherSnapshotId:
                provenance.weatherSnapshotId ?? null,

              routeSnapshotId:
                provenance.routeSnapshotId ?? null,

              sunsetSnapshotId:
                provenance.sunsetSnapshotId ?? null,

              totalScore:
                evaluation.totalScore,

              level:
                evaluation.level,

              canProceed:
                evaluation.canProceed,

              weatherScore:
                evaluation.weatherScore,

              durationScore:
                evaluation.durationScore,

              timeScore:
                evaluation.timeScore,

              /**
               * Legacy DB field name
               *
               * ปัจจุบัน semantic คือ
               * Transport / Accessibility
               */
              userProfileScore:
                evaluation.userProfileScore,

              factors:
                evaluation.factors as Prisma.InputJsonValue,

              constraints:
                evaluation.constraints as Prisma.InputJsonValue,

              summary:
                evaluation.summary,

              recommendation:
                evaluation.recommendation,

              explanationHeadline:
                explanation.headline,

              explanationText:
                explanation.explanation,

              evaluatedAt:
                new Date(
                  evaluation.evaluatedAt,
                ),
            },
          });

        return createdEvaluation;
      },
    );

  return {
    tripId:
      ownedTripId,

    data:
      mapEvaluationToDto(
        savedEvaluation,
      ),
  };
}

/**
 * Public service เดิม
 *
 * เก็บไว้เพื่อ backward compatibility กับ:
 *
 * - POST /api/v1/trips/[id]/evaluate
 * - unit tests เดิม
 * - code อื่นที่เรียก evaluateTripForCurrentUser()
 *
 * Legacy/manual path uses only fields stored on Trip. It never mixes
 * partial live snapshots with stale Trip fields.
 */
export async function evaluateTripForCurrentUser(
  tripId: string,
): Promise<EvaluateTripResult> {
  const trip =
    await getTripForCurrentUser(tripId);
  assertTripCanBeEvaluated(trip);

  const evaluationInput: TripEvaluationInput = {
    weatherCondition: trip.weatherCondition,
    estimatedTravelMinutes: trip.estimatedTravelMinutes,
    tripDate: trip.tripDate,
    timeZone: process.env.APP_TIMEZONE || "Asia/Bangkok",
    departAt: trip.departAt,
    mockSunsetTime: trip.mockSunsetTime ?? undefined,
    parkOpenTime: trip.park.openTime,
    parkCloseTime: trip.park.closeTime,
    travelerCount: trip.travelerCount,
    transportMode: trip.transportMode,
    hasDirectPublicTransit: undefined,
    parkName: trip.park.nameTh,
  };

  /**
   * จากตรงนี้ใช้ pipeline ใหม่ทั้งหมด:
   *
   * Engine
   * → factors / constraints
   * → LLM explainer
   * → save DB
   */
  return evaluateAndSaveTripForCurrentUser(
    trip.id,
    evaluationInput,
  );
}
