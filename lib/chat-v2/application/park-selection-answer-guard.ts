import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

type ToolResult = { toolName: string; output: unknown };

/** Only a confirmed selectPark tool result can authorize a selection confirmation. */
export function finalizeParkSelectionAnswer(
  text: string,
  results: ToolResult[],
  state: AssistantV2ConversationState,
): string {
  const selections = results.filter((result) => result.toolName === "selectPark");
  if (!selections.length) return text;
  const last = selections.at(-1)?.output;
  if (!last || typeof last !== "object" || !("selected" in last)) {
    return "ยังยืนยันการเลือกอุทยานไม่ได้ครับ กรุณาระบุชื่ออุทยานที่ต้องการเลือกอีกครั้ง";
  }
  if (last.selected !== true) {
    const reason = "reason" in last ? last.reason : undefined;
    return reason === "NO_CURRENT_RESULTS" || reason === "INVALID_POSITION"
      ? "ยังเลือกอุทยานไม่ได้ครับ กรุณาระบุชื่ออุทยานหรือเลือกลำดับจากรายการล่าสุดที่แสดงอีกครั้ง"
      : "ยังไม่ได้เปลี่ยนอุทยานครับ กรุณาระบุชื่ออุทยานที่ต้องการเลือกให้ชัดเจน";
  }
  const park = "park" in last ? last.park : undefined;
  if (!park || typeof park !== "object" || !("slug" in park)
    || typeof park.slug !== "string" || state.selectedPark?.slug !== park.slug) {
    return "ยังยืนยันการเลือกอุทยานไม่ได้ครับ กรุณาลองเลือกอีกครั้ง";
  }
  // Prevent fabricated selection claims even if the model chose other wording.
  return `เลือก${state.selectedPark.name}เรียบร้อยครับ`;
}
