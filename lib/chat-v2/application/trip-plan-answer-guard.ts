/** Keep user-visible planning claims consistent with the authoritative planTrip result. */
export function finalizeTripPlanAnswer(
  text: string,
  toolResults: Array<{ toolName: string; output: unknown }>,
): string {
  const last = toolResults.filter((result) => result.toolName === "planTrip").at(-1)?.output;
  if (!last || typeof last !== "object" || !("status" in last)) return text;
  if (last.status === "DRAFT_EXISTS") {
    const draft = "draftTrip" in last && last.draftTrip && typeof last.draftTrip === "object"
      && "park" in last.draftTrip ? last.draftTrip.park : undefined;
    const parkName = draft && typeof draft === "object" && "name" in draft && typeof draft.name === "string"
      ? draft.name : undefined;
    return parkName
      ? `ยังไม่ได้สร้างแผนใหม่ครับ เพราะมีแผนฉบับร่างของ${parkName}อยู่แล้ว หากต้องการวางแผนที่อุทยานอื่น ต้องเลือกว่าจะเก็บแผนเดิมไว้ก่อน หรือยกเลิกแผนฉบับร่างเดิม แล้วค่อยสร้างใหม่ครับ`
      : "ยังไม่ได้สร้างแผนใหม่ครับ เพราะมีแผนฉบับร่างเดิมอยู่แล้ว กรุณาตรวจ แก้ไข หรือยกเลิกแผนเดิมก่อน แล้วจึงขอสร้างแผนใหม่ได้";
  }
  if (last.status === "NEEDS_CLARIFICATION") {
    const message = "message" in last && typeof last.message === "string" ? last.message : undefined;
    return message || "ต้องการวางแผนเที่ยวที่อุทยานแห่งไหนครับ?";
  }
  return text;
}
