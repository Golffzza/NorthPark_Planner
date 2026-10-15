/** Keep user-visible planning claims consistent with the authoritative planTrip result. */
export function finalizeTripPlanAnswer(
  text: string,
  toolResults: Array<{ toolName: string; output: unknown }>,
): string {
  const last = toolResults.filter((result) => result.toolName === "planTrip").at(-1)?.output;
  if (!last || typeof last !== "object" || !("status" in last)) return text;
  if (last.status === "DRAFT_EXISTS") {
    return "ยังไม่ได้สร้างแผนใหม่ครับ เพราะมีแผนฉบับร่างเดิมอยู่แล้ว กรุณาตรวจ แก้ไข หรือยกเลิกแผนเดิมก่อน แล้วจึงขอสร้างแผนใหม่ได้";
  }
  if (last.status === "NEEDS_CLARIFICATION") {
    const message = "message" in last && typeof last.message === "string" ? last.message : undefined;
    return message || "ต้องการวางแผนเที่ยวที่อุทยานแห่งไหนครับ?";
  }
  return text;
}
