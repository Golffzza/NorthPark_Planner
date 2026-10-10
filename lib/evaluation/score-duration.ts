//* ./lib/evaluation/score-duration.ts

function interpolate(
  value: number,
  startValue: number,
  startScore: number,
  endValue: number,
  endScore: number,
): number {
  if (startValue === endValue) {
    return startScore;
  }

  const ratio =
    (value - startValue) / (endValue - startValue);

  return startScore + ratio * (endScore - startScore);
}

export function scoreDuration(
  estimatedTravelMinutes: number,
): number {
  const minutes = Math.max(0, estimatedTravelMinutes);

  // เดินทางไม่เกิน 1 ชั่วโมงครึ่ง
  if (minutes <= 90) {
    return 95;
  }

  // 1.5 - 3 ชั่วโมง
  if (minutes <= 180) {
    return Math.round(
      interpolate(minutes, 90, 95, 180, 80),
    );
  }

  // 3 - 5 ชั่วโมง
  if (minutes <= 300) {
    return Math.round(
      interpolate(minutes, 180, 80, 300, 60),
    );
  }

  // 5 - 7 ชั่วโมง
  if (minutes <= 420) {
    return Math.round(
      interpolate(minutes, 300, 60, 420, 40),
    );
  }

  // 7 - 10 ชั่วโมง
  if (minutes <= 600) {
    return Math.round(
      interpolate(minutes, 420, 40, 600, 20),
    );
  }

  return 20;
}