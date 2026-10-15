import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import type { NearbyPlace, NearbySearchResult } from "@/lib/services/nearby-places-service";

type NearbyToolResult = { toolName: string; output: unknown };

function normalize(value: string): string {
  return value.replace(/\*\*|__/g, "").toLocaleLowerCase("th-TH")
    .replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function isPlace(value: unknown): value is NearbyPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<NearbyPlace>;
  return typeof place.id === "string" && typeof place.name === "string"
    && typeof place.osmUrl === "string" && typeof place.category === "string"
    && typeof place.straightLineDistanceMeters === "number";
}

function displayedPlaces(message: string, candidates: NearbyPlace[]): NearbyPlace[] | undefined {
  const numbered: Array<{ number: number; text: string }> = [];
  const bullets: string[] = [];
  for (const line of message.split(/\r?\n/)) {
    const number = line.match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(\d+)[.)．、](?:\*\*)?\s+(.+)$/);
    if (number) {
      numbered.push({ number: Number(number[1]), text: number[2] });
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) bullets.push(bullet[1]);
  }
  if (numbered.some((row, index) => row.number !== index + 1)) return undefined;
  const rows = numbered.length ? numbered.map((row) => row.text) : bullets;
  if (!rows.length) {
    const text = normalize(message);
    const mentioned = candidates.filter((candidate) => {
      const name = normalize(candidate.name);
      const at = name ? text.indexOf(name) : -1;
      return at >= 0 && (at === 0 || /[\s:：,，.。()（）\-–—]/.test(text[at - 1]))
        && (!text[at + name.length] || /[\s:：,，.。()（）\-–—]/.test(text[at + name.length]));
    });
    return mentioned.length === 1 ? mentioned : undefined;
  }

  const displayed: NearbyPlace[] = [];
  for (const row of rows) {
    const text = normalize(row);
    const matches = candidates.filter((candidate) => {
      const name = normalize(candidate.name);
      if (!name || !text.startsWith(name)) return false;
      return !text[name.length] || /[\s:：,，.。()（）\-–—]/.test(text[name.length]);
    });
    if (matches.length !== 1 || displayed.some((place) => place.id === matches[0].id)) return undefined;
    displayed.push(matches[0]);
  }
  return displayed;
}

/** Store only the OSM places whose names appear as list items in the final user-visible text. */
export function reconcileDisplayedNearbyResults(
  state: AssistantV2ConversationState,
  finalMessage: string,
  toolResults: NearbyToolResult[],
): void {
  const last = [...toolResults].reverse().find((item) => item.toolName === "findNearbyPlaces");
  if (!last) return;
  const output = last.output as {
    status?: string;
    places?: unknown[];
    meta?: Partial<NearbySearchResult["meta"]>;
    referenceResolution?: string;
    searchedPark?: AssistantV2ConversationState["selectedPark"];
  } | undefined;
  if (output?.referenceResolution === "DISPLAYED_RESULT" || output?.status === "PLACE_REFERENCE_REQUIRED") return;
  state.nearbyResults = undefined;
  if (output?.status !== "OK" || !Array.isArray(output.places)) return;
  const candidates = output.places.filter(isPlace);
  const places = displayedPlaces(finalMessage, candidates);
  if (!places?.length) return;
  const source = output.meta?.source;
  if (source !== "GEOAPIFY_PLACES" && source !== "OPENSTREETMAP_OVERPASS") return;
  // Nearby itself does not select a park. The result identifies the searched park
  // independently of a possibly changed Selected Park.
  const searchedPark = output.searchedPark;
  if (!searchedPark) return;
  state.nearbyResults = {
    park: { ...searchedPark }, providerSource: source,
    places: places.map((place) => ({ ...place })),
  };
}

const ORDINALS: Record<string, number> = { แรก: 1, หนึ่ง: 1, "1": 1, สอง: 2, "2": 2, สาม: 3, "3": 3, สี่: 4, "4": 4, ห้า: 5, "5": 5 };
const positionPattern = /(?:ร้าน(?:อาหาร)?|คาเฟ่|ที่พัก|โรงแรม|สถานที่|แห่ง|จุด)\s*(?:ลำดับ|อันดับ)?\s*(?:ที่)?\s*(แรก|หนึ่ง|สอง|สาม|สี่|ห้า|[1-5])/;
const barePositionPattern = /(?:อัน|ข้อ|อันดับ|ลำดับ)\s*(?:ที่)?\s*(แรก|หนึ่ง|สอง|สาม|สี่|ห้า|[1-5])/;

function asksForBareNearbyPosition(message: string): boolean {
  return /ห่างจากอุทยาน/.test(message) && barePositionPattern.test(message);
}

export function isNearbyDiscoveryQuestion(message: string): boolean {
  return /(?:มี|หา|ค้น|แนะนำ|ขอ|อยากได้)\s*(?:ร้าน(?:อาหาร|กาแฟ)?|คาเฟ่|ที่พัก|โรงแรม|ลานกางเต็นท์|จุดท่องเที่ยว|สถานที่)/.test(normalize(message));
}

export function isNearbyDistanceQuestion(message: string): boolean {
  return !isNearbyDiscoveryQuestion(message)
    && /(?:ไกล|ใกล้|ห่าง|ระยะทาง|ขับรถ|ขับไป|ใช้เวลา|กี่นาที|สะดวกไหม)/.test(message);
}

export function asksForDisplayedNearbyPlace(message: string): boolean {
  const normalized = normalize(message);
  return isNearbyDistanceQuestion(normalized) && (positionPattern.test(normalized)
    || asksForBareNearbyPosition(normalized)
    || /(?:ร้าน|คาเฟ่|ที่พัก|โรงแรม)(?:นั้น|นี้|ที่เจอ|ที่พบ)|(?:ที่นั่น|ที่นั้น|แห่งนั้น|สถานที่นั้น)/.test(normalized));
}

export function resolveDisplayedNearbyPlace(
  state: AssistantV2ConversationState,
  message: string,
  parkSlug: string,
): NearbyPlace | undefined {
  const context = state.nearbyResults;
  if (!context || context.park.slug !== parkSlug) return undefined;
  const places = context.places;
  const normalized = normalize(message);
  const named = places.filter((place) => normalized.includes(normalize(place.name)));
  if (named.length > 1) return undefined;
  if (named.length === 1) return named[0];

  const positional = normalized.match(positionPattern)
    ?? (asksForBareNearbyPosition(normalized) ? normalized.match(barePositionPattern) : null);
  if (positional) {
    const place = places[ORDINALS[positional[1]] - 1];
    if (!place) return undefined;
    if (/^(?:ร้าน|คาเฟ่)/.test(positional[0]) && place.category !== "food") return undefined;
    if (/^(?:ที่พัก|โรงแรม)/.test(positional[0]) && place.category !== "accommodation") return undefined;
    return place;
  }
  const category = /(?:ร้าน|คาเฟ่)(?:นั้น|นี้|ที่เจอ|ที่พบ)/.test(normalized) ? "food"
    : /(?:ที่พัก|โรงแรม)(?:นั้น|นี้|ที่เจอ|ที่พบ)/.test(normalized) ? "accommodation"
    : /(?:ที่นั่น|ที่นั้น|แห่งนั้น|สถานที่นั้น)/.test(normalized) ? "all" : undefined;
  if (!category) return undefined;
  const matches = category === "all" ? places : places.filter((place) => place.category === category);
  return matches.length === 1 ? matches[0] : undefined;
}

export function finalizeNearbyFollowupAnswer(finalMessage: string, toolResults: NearbyToolResult[], question = ""): string {
  const last = [...toolResults].reverse().find((item) => item.toolName === "findNearbyPlaces");
  const output = last?.output as {
    status?: string; reason?: string; referenceResolution?: string; places?: unknown[];
    park?: { name?: string }; searchedPark?: { name?: string };
    meta?: { radiusMeters?: number; categories?: string[] };
  } | undefined;
  if (output?.status === "PLACE_REFERENCE_REQUIRED" || (!last && asksForDisplayedNearbyPlace(question))) {
    return "ขอชื่อร้านหรือสถานที่ที่ต้องการทราบระยะทางก่อนครับ เพื่อให้ตรวจข้อมูลได้ตรงแห่ง";
  }
  if (output?.status === "REFERENCE_ERROR" && ["AMBIGUOUS_REFERENCE", "INVALID_POSITION"].includes(output.reason ?? "")) {
    return "ขอชื่ออุทยานที่ต้องการค้นสถานที่ใกล้เคียงก่อนครับ เพราะยังยืนยันลำดับอุทยานที่อ้างถึงไม่ได้";
  }
  if (output?.status?.startsWith("UPSTREAM_")) {
    return "ยังตรวจข้อมูลสถานที่รอบอุทยานจากบริการภายนอกไม่ได้ในขณะนี้ครับ";
  }
  if (output?.status === "EMPTY") {
    const category = output.meta?.categories?.length === 1 ? output.meta.categories[0] : undefined;
    const subject = ({ food: "ร้านอาหารหรือคาเฟ่", accommodation: "ที่พัก", campsite: "ลานกางเต็นท์",
      attraction: "จุดท่องเที่ยว", service: "บริการ" } as Record<string, string>)[category ?? ""] ?? "สถานที่";
    const parkName = output.searchedPark?.name ?? output.park?.name;
    const radius = output.meta?.radiusMeters;
    const scope = Number.isFinite(radius) && radius! > 0
      ? `ในรัศมี ${radius!.toLocaleString("en-US")} เมตร` : "ในรัศมีที่ค้น";
    return `ยังไม่พบข้อมูล${subject}จากผลค้นหา${scope} รอบจุดอ้างอิงของ${parkName ?? "อุทยาน"} ผลค้นหานี้ยังยืนยันสภาพพื้นที่ทั้งหมดไม่ได้ครับ`;
  }
  if (output?.status !== "OK" || !["DISPLAYED_RESULT", "EXPLICIT_NAME"].includes(output.referenceResolution ?? "")) return finalMessage;
  const place = output.places?.length === 1 && isPlace(output.places[0]) ? output.places[0] : undefined;
  if (!place) return "ขอชื่อร้านหรือสถานที่ที่ต้องการทราบระยะทางก่อนครับ";
  const straight = `ระยะทางเส้นตรง ${Math.round(place.straightLineDistanceMeters)} เมตรจากจุดอ้างอิงอุทยาน`;
  const road = place.routeStatus === "OK" && Number.isFinite(place.roadDistanceMeters)
    && Number.isFinite(place.estimatedDrivingMinutes)
    ? `ระยะขับรถตาม OSRM ${Math.round(place.roadDistanceMeters!)} เมตร ใช้เวลาประมาณ ${Math.round(place.estimatedDrivingMinutes!)} นาที`
    : "ยังไม่มีข้อมูลเส้นทางขับรถและเวลาเดินทางที่ยืนยันได้";
  return `จากผลค้นหาก่อนหน้า ${place.name}: ${straight}; ${road}ครับ`;
}
