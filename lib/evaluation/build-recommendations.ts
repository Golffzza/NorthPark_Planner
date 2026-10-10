//* ./lib/evaluation/build-recommendations.ts

import type { RecommendationContext } from "./types";

function buildPrimaryRecommendation(
  context: RecommendationContext,
): string {
  switch (context.weakestFactor) {
    case "weather":
      switch (context.weatherCondition) {
        case "STORM":
          return "สภาพอากาศเป็นปัจจัยหลักที่ควรให้ความสำคัญ ควรตรวจสอบพยากรณ์อากาศล่าสุดก่อนออกเดินทาง และพิจารณาปรับแผนหากสภาพอากาศยังรุนแรง";

        case "HEAVY_RAIN":
          return "มีฝนตกหนักในช่วงวันที่ประเมิน ควรตรวจสอบพยากรณ์อากาศล่าสุดและเผื่อเวลาเดินทางเพิ่มเติม";

        case "LIGHT_RAIN":
          return "มีฝนเล็กน้อยในช่วงวันที่ประเมิน ควรตรวจสอบพยากรณ์อากาศอีกครั้งก่อนออกเดินทางและเผื่อเวลาสำหรับการเดินทาง";

        case "CLOUDY":
          return "มีเมฆมากในช่วงวันที่ประเมิน ควรติดตามพยากรณ์อากาศล่าสุดก่อนออกเดินทาง";

        case "CLEAR":
        default:
          return "สภาพอากาศโดยรวมอยู่ในเกณฑ์ที่เหมาะสม ควรตรวจสอบข้อมูลล่าสุดอีกครั้งก่อนออกเดินทาง";
      }

    case "duration":
      return "ระยะเวลาเดินทางเป็นปัจจัยที่ควรพิจารณา ควรวางแผนเวลาพักระหว่างทางและเผื่อเวลาเพิ่มเติมหากการเดินทางใช้เวลานาน";

    case "time":
      return "ช่วงเวลาที่คาดว่าจะถึงจุดหมายเป็นปัจจัยที่ควรตรวจสอบ ควรพิจารณาออกเดินทางให้เร็วขึ้น และตรวจสอบเวลาเข้าถึงกับอุทยานก่อนเดินทาง";

    case "userProfile":
      if (
        context.transportMode ===
          "PUBLIC_TRANSPORT" &&
        context.hasDirectPublicTransit === false
      ) {
        return `อุทยาน${
          context.parkName
            ? ` (${context.parkName})`
            : ""
        }ไม่มีระบบขนส่งสาธารณะตรงถึงจุดหมายตามข้อมูลที่ระบบมี ควรวางแผนการต่อรถหรือจัดหาพาหนะสำหรับช่วงสุดท้ายของการเดินทางล่วงหน้า`;
      }

      if (
        context.transportMode ===
          "PUBLIC_TRANSPORT" &&
        context.hasDirectPublicTransit === undefined
      ) {
        return "ยังไม่มีข้อมูลยืนยันเกี่ยวกับระบบขนส่งสาธารณะตรงถึงจุดหมาย ควรตรวจสอบเส้นทางและการต่อรถก่อนเดินทาง";
      }

      return "ควรตรวจสอบรายละเอียดการเข้าถึงจุดหมายด้วยรูปแบบการเดินทางที่เลือกก่อนออกเดินทาง";
  }
}

export function buildRecommendations(
  context: RecommendationContext,
): string {
  const recommendations: string[] = [
    buildPrimaryRecommendation(context),
  ];

  /**
   * จำนวนผู้เดินทางไม่มีผลต่อคะแนนอีกแล้ว
   * แต่ยังใช้สร้างคำแนะนำที่เป็นประโยชน์ได้
   */
  if (context.travelerCount <= 1) {
    recommendations.push(
      "หากเดินทางคนเดียว ควรแจ้งแผนการเดินทางและช่วงเวลาที่คาดว่าจะถึงให้บุคคลใกล้ชิดทราบ",
    );
  }

  return recommendations.join(" ");
}
