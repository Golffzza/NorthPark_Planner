//* ./scripts/test-evaluation-explainer.ts

import { explainTripEvaluation } from "@/lib/services/evaluation-explainer-service";

async function main() {
  console.log("\n====================================");
  console.log(" NorthPark Evaluation Explainer Test");
  console.log("====================================\n");

  const explanation = await explainTripEvaluation({
    totalScore: 72,
    level: "GOOD",
    canProceed: true,

    weatherScore: 60,
    durationScore: 61,
    timeScore: 90,
    userProfileScore: 90,

    factors: {
      weather: {
        score: 60,
        status: "CAUTION",
        reason: "มีฝนเล็กน้อยในช่วงเวลาที่ประเมิน",
      },

      duration: {
        score: 61,
        status: "CAUTION",
        reason: "ใช้เวลาเดินทางประมาณ 4 ชั่วโมง 54 นาที",
      },

      time: {
        score: 90,
        status: "GOOD",
        reason: "คาดว่าจะถึงอุทยานก่อนเวลาปิด",
      },

      userProfile: {
        score: 90,
        status: "GOOD",
        reason: "เดินทางด้วยรถยนต์ส่วนตัว",
      },
    },

    constraints: [],

    summary:
      'ผลการประเมินอยู่ในระดับ "เดินทางได้ แต่มีจุดที่ควรตรวจสอบ" โดยปัจจัยด้านสภาพอากาศเป็นปัจจัยที่ควรให้ความสำคัญมากที่สุดในแผนปัจจุบัน',

    recommendation:
      "มีฝนเล็กน้อยในช่วงการเดินทาง ควรตรวจสอบพยากรณ์อากาศอีกครั้งก่อนออกเดินทางและเผื่อเวลาสำหรับสภาพถนนที่อาจเปลี่ยนแปลง",
  });

  console.log("Headline:");
  console.log(explanation.headline);

  console.log("\nExplanation:");
  console.log(explanation.explanation);

  console.log("\n====================================");
  console.log(" Test completed");
  console.log("====================================\n");
}

main().catch((error) => {
  console.error("\n❌ Explainer test failed");
  console.error(error);

  process.exitCode = 1;
});