//* ./lib/evaluation/one-sentence-verdict.ts

export type OneSentenceVerdictInput = {
  totalScore: number;
  canProceed?: boolean;
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;
  constraints?: Array<{
    severity: "BLOCKING" | "WARNING";
    message: string;
  }>;
};

export type OneSentenceVerdictResult = {
  verdict: string;
  tone: "positive" | "caution" | "warning";
  highlightFactor?: "weather" | "duration" | "time" | "userProfile";
};

/**
 * สรุปผลความพร้อมการเดินทางเป็นภาษาพูดใน 1 บรรทัด (One-sentence Verdict)
 * ผู้ใช้เปิดดูในมือถือแค่วินาทีเดียวก็เข้าใจทันทีโดยไม่ต้องอ่านกราฟทุกตัว
 */
export function generateOneSentenceVerdict(
  input: OneSentenceVerdictInput,
): OneSentenceVerdictResult {
  const {
    totalScore,
    canProceed = true,
    weatherScore,
    durationScore,
    timeScore,
    userProfileScore,
    constraints = [],
  } = input;

  const blockingConstraint = constraints.find(
    (item) => item.severity === "BLOCKING",
  );

  if (!canProceed || blockingConstraint) {
    return {
      verdict: blockingConstraint?.message
        ? `⚠️ ติดเงื่อนไขสำคัญ: ${blockingConstraint.message} แนะนำปรับแผนก่อนเดินทาง`
        : "⚠️ แผนนี้ติดเงื่อนไขสำคัญ แนะนำปรับวันหรือเวลาเดินทางก่อนออกเดินทางจริง",
      tone: "warning",
    };
  }

  // 1. ตรวจจับจุดเด่นที่เป็นบวก
  let positivePart = "";
  if (weatherScore >= 80) {
    positivePart = "ทริปนี้สภาพอากาศดีมาก 🌤️";
  } else if (weatherScore >= 65) {
    positivePart = "สภาพอากาศปลอดโปร่งเหมาะแก่การเที่ยว ⛅";
  } else if (timeScore >= 80) {
    positivePart = "ทริปนี้ช่วงเวลาเดินทางลงตัว ⏰";
  } else if (durationScore >= 80) {
    positivePart = "ระยะเวลาขับขี่กำลังพอดี 🚗";
  } else if (totalScore >= 75) {
    positivePart = "แผนการเดินทางโดยรวมมีความพร้อมสูง ✨";
  } else {
    positivePart = "แผนการเดินทางโดยรวมพร้อมเดินทาง 🌿";
  }

  // 2. หาปัจจัยที่มีคะแนนต่ำที่สุดหรือควรระวัง
  const factorRanking = [
    { key: "time" as const, score: timeScore },
    { key: "weather" as const, score: weatherScore },
    { key: "duration" as const, score: durationScore },
    { key: "userProfile" as const, score: userProfileScore },
  ].sort((a, b) => a.score - b.score);

  const weakest = factorRanking[0];

  // 3. กรณีทุกปัจจัยอยู่ในเกณฑ์ปลอดภัยสูง
  if (weakest.score >= 75 && totalScore >= 75) {
    return {
      verdict: `${positivePart} และเวลาเดินทางลงตัว พร้อมออกเดินทางตามแผนได้เลย! ✨`,
      tone: "positive",
    };
  }

  // 4. กรณีมีปัจจัยที่ควรระวัง — สร้างคำแนะนำที่ตรงจุด
  if (weakest.key === "time" || (timeScore < 75 && timeScore <= weatherScore)) {
    return {
      verdict: `${positivePart} แต่แนะนำให้ออกเดินทางเร็วขึ้น 1 ชม. เพื่อให้ถึงก่อนพระอาทิตย์ตก 🌅`,
      tone: "caution",
      highlightFactor: "time",
    };
  }

  if (weakest.key === "duration") {
    return {
      verdict: `${positivePart} แต่การเดินทางค่อนข้างไกล แนะนำวางแผนแวะจุดพักรถเพื่อลดความเหนื่อยล้า 🚗`,
      tone: "caution",
      highlightFactor: "duration",
    };
  }

  if (weakest.key === "weather") {
    return {
      verdict: `${positivePart} แต่มีโอกาสพบฝนตก แนะนำเตรียมอุปกรณ์กันฝนและเช็กสภาพอากาศล่วงหน้า 🌧️`,
      tone: "caution",
      highlightFactor: "weather",
    };
  }

  if (weakest.key === "userProfile") {
    return {
      verdict: `${positivePart} แต่ควรตรวจเช็กสภาพพาหนะและระบบเบรกให้พร้อมรับเส้นทางลาดชัน 🚙`,
      tone: "caution",
      highlightFactor: "userProfile",
    };
  }

  return {
    verdict: `${positivePart} สามารถเดินทางได้ตามแผน เพียงตรวจเช็กเวลาและสัมภาระก่อนออกเดินทาง 🎒`,
    tone: "positive",
  };
}
