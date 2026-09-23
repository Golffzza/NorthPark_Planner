import type { RecommendationContext } from "./types";

export function buildRecommendations(context: RecommendationContext): string {
  switch (context.weakestFactor) {
    case "weather":
      return `สภาพอากาศเป็นปัจจัยหลักที่ต้องระวัง ควรตรวจสอบพยากรณ์อากาศล่วงหน้าหรือรอช่วงสภาพอากาศแจ่มใสก่อนออกเดินทาง`;
    case "duration":
      return `ระยะเวลาเดินทางค่อนข้างนาน อาจทำให้เหนื่อยล้า ควรวางแผนจุดพักรถ ออกเดินทางให้เช้าขึ้น หรือแวะพักค้างคืนระหว่างทาง`;
    case "time":
      return `เวลาเดินทางและแสงอาทิตย์เป็นปัจจัยที่ควรปรับปรุง ควรออกเดินทางให้เช้าขึ้นเพื่อหลีกเลี่ยงการเดินทางถึงอุทยานใกล้ค่ำหรือหลังเวลาปิดทำการ`;
    case "userProfile":
      if (context.transportMode === "PUBLIC_TRANSPORT" && context.hasDirectPublicTransit === false) {
        return `อุทยาน${context.parkName ? ` (${context.parkName})` : ""}ไม่มีรถโดยสารประจำทางวิ่งตรงถึงที่ทำการ แนะนำให้วางแผนเหมารถสองแถวท้องถิ่นจากตัวอำเภอล่วงหน้า หรือเปลี่ยนไปใช้รถยนต์ส่วนบุคคล`;
      }
      if (
        context.transportMode === "MOTORCYCLE" &&
        (context.weatherCondition === "HEAVY_RAIN" || context.weatherCondition === "STORM" || context.weatherCondition === "LIGHT_RAIN")
      ) {
        return `การขับขี่รถจักรยานยนต์บนเส้นทางภูเขาในสภาพอากาศที่มีฝนตกมีความเสี่ยงสูง ควรตรวจเช็คดอกยาง เบรก สวมชุดกันฝน หรือพิจารณาเปลี่ยนไปใช้รถยนต์ส่วนบุคคล`;
      }
      if (context.travelerCount <= 1) {
        return `ความพร้อมของผู้เดินทางและพาหนะควรได้รับการดูแล การเดินทางคนเดียวในเส้นทางธรรมชาติแนะนำแจ้งแผนการเดินทางแก่คนใกล้ชิดและศึกษาเส้นทางล่วงหน้า`;
      }
      return `ความพร้อมของผู้เดินทางและพาหนะควรได้รับการดูแล แนะนำเดินทางเป็นกลุ่มหรือเลือกใช้ยานพาหนะที่มีความปลอดภัยสูงขึ้น`;
  }
}

