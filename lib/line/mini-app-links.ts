export type MiniAppEntryKey = "exploreParks" | "planTrip" | "myTrips" | "alerts";
export type TripEntryTab = "overview" | "alerts";

type MiniAppEntryDefinition = {
  key: MiniAppEntryKey;
  label: string;
  description: string;
  path: string;
};

// Rich Menu / permanent link mapping for Phase 2 Sprint 2.3:
// - สำรวจอุทยาน -> /parks
// - วางแผนทริป -> /trips/new
// - ทริปของฉัน -> /trips
// - แจ้งเตือน -> /trips?tab=alerts
export const MINI_APP_ENTRY_POINTS: Record<MiniAppEntryKey, MiniAppEntryDefinition> = {
  exploreParks: {
    key: "exploreParks",
    label: "สำรวจอุทยาน",
    description: "Entry point สำหรับ browse parks ใน MINI App",
    path: "/parks",
  },
  planTrip: {
    key: "planTrip",
    label: "วางแผนทริป",
    description: "Entry point สำหรับเริ่มสร้างทริปใหม่",
    path: "/trips/new",
  },
  myTrips: {
    key: "myTrips",
    label: "ทริปของฉัน",
    description: "Entry point สำหรับดูรายการทริปของผู้ใช้",
    path: "/trips",
  },
  alerts: {
    key: "alerts",
    label: "แจ้งเตือน",
    description: "Entry point แบบ fallback-ready สำหรับ alerts tab",
    path: "/trips?tab=alerts",
  },
};

export function normalizeTripEntryTab(value?: string | null): TripEntryTab {
  return value === "alerts" ? "alerts" : "overview";
}

export function buildTripsEntryPath(tab?: TripEntryTab) {
  return tab === "alerts" ? MINI_APP_ENTRY_POINTS.alerts.path : MINI_APP_ENTRY_POINTS.myTrips.path;
}

export function buildMiniAppEntryPath(entryKey: MiniAppEntryKey) {
  return MINI_APP_ENTRY_POINTS[entryKey].path;
}

export function buildMiniAppEntryUrl(baseUrl: string, entryKey: MiniAppEntryKey) {
  return new URL(buildMiniAppEntryPath(entryKey), baseUrl).toString();
}

export function listMiniAppEntryPoints() {
  return Object.values(MINI_APP_ENTRY_POINTS);
}
