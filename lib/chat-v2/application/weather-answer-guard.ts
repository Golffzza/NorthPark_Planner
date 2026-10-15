export function finalizeWeatherClarificationAnswer(
  text: string,
  toolResults: Array<{ toolName: string; output: unknown }>,
): string {
  const lastWeather = toolResults.filter((result) => result.toolName === "getParkWeather").at(-1)?.output;
  if (lastWeather && typeof lastWeather === "object" && "status" in lastWeather
    && (lastWeather.status === "AMBIGUOUS_PARK" || lastWeather.status === "PARK_REQUIRED")) {
    return "หมายถึงอุทยานแห่งไหนครับ? กรุณาบอกชื่ออุทยานเพื่อให้ตรวจสภาพอากาศได้ถูกต้อง";
  }
  return text;
}
