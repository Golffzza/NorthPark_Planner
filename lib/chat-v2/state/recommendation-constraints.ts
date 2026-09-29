// ./lib/chat-v2/state/recommendation-constraints.ts

import type { AssistantConstraints } from "@/lib/chat/shared/contracts";

export type RecommendationConstraintPatch = AssistantConstraints & {
  reset?: boolean;
};

function unique(values: string[] | undefined): string[] | undefined {
  return values ? [...new Set(values)] : undefined;
}

export function mergeRecommendationConstraints(
  current: AssistantConstraints,
  patch: RecommendationConstraintPatch,
): AssistantConstraints {
  const next: AssistantConstraints = patch.reset
    ? {}
    : structuredClone(current);

  // Replace single-value constraints
  if (patch.province !== undefined) {
    next.province = patch.province;
  }

  if (patch.fatigue !== undefined) {
    next.fatigue = patch.fatigue;
  }

  if (patch.durationDays !== undefined) {
    next.durationDays = patch.durationDays;
  }

  // Companions are treated as replacement.
  // [] explicitly clears FAMILY / ELDERLY etc.
  if (patch.companions !== undefined) {
    next.companions = unique(patch.companions) ?? [];
  }

  // Activities are additive.
  // If the user explicitly requests an activity that was previously excluded,
  // remove that activity from excludedActivities.
  if (patch.activities !== undefined) {
    const requestedActivities = unique(patch.activities) ?? [];

    next.activities =
      unique([
        ...(next.activities ?? []),
        ...requestedActivities,
      ]) ?? [];

    const requestedSet = new Set(requestedActivities);

    next.excludedActivities = (next.excludedActivities ?? []).filter(
      (activity) => !requestedSet.has(activity),
    );
  }

  // Exclusions are additive.
  // If the user excludes an activity that was previously requested,
  // remove that activity from activities.
  if (patch.excludedActivities !== undefined) {
    const newExclusions = unique(patch.excludedActivities) ?? [];

    next.excludedActivities =
      unique([
        ...(next.excludedActivities ?? []),
        ...newExclusions,
      ]) ?? [];

    const excludedSet = new Set(next.excludedActivities);

    next.activities = (next.activities ?? []).filter(
      (activity) => !excludedSet.has(activity),
    );
  }

  return next;
}