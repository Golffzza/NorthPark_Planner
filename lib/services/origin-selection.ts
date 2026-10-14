import type { OriginPlace } from "@/lib/services/origin-geocoding-service";

export type OriginChoice = { source: "none" | "manual" | "gps" | "search"; text: string; lat: number | null; lng: number | null };

export const emptyOrigin: OriginChoice = { source: "none", text: "", lat: null, lng: null };

export function manualOrigin(text: string): OriginChoice {
  return { source: text.trim() ? "manual" : "none", text, lat: null, lng: null };
}

export function searchedOrigin(place: OriginPlace): OriginChoice {
  return { source: "search", text: place.name, lat: place.lat, lng: place.lng };
}

export function gpsOrigin(lat: number, lng: number): OriginChoice {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Invalid GPS coordinates");
  }
  return { source: "gps", text: "ตำแหน่งปัจจุบัน (GPS)", lat, lng };
}

export function gpsErrorMessage(code: number): string {
  if (code === 1) return "ไม่ได้รับอนุญาตให้ใช้ตำแหน่งปัจจุบัน คุณยังบันทึกแผนโดยไม่ระบุจุดเริ่มต้นได้";
  if (code === 3) return "หมดเวลารอตำแหน่ง กรุณาลองใหม่หรือค้นหาสถานที่";
  return "ไม่สามารถระบุตำแหน่งได้ คุณยังบันทึกแผนโดยไม่ระบุจุดเริ่มต้นได้";
}

export function requestGpsOrigin(provider: Pick<Geolocation, "getCurrentPosition">): Promise<OriginChoice> {
  return new Promise((resolve, reject) => provider.getCurrentPosition(
    (position) => {
      try { resolve(gpsOrigin(position.coords.latitude, position.coords.longitude)); }
      catch { reject(new Error("พิกัด GPS ไม่ถูกต้อง")); }
    },
    (error) => reject(new Error(gpsErrorMessage(error.code))),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  ));
}
