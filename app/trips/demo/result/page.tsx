import Link from "next/link";
import { ScoreHeroCard } from "@/components/evaluation/score-hero-card";
import { PlanAdjustmentBanner } from "@/components/evaluation/plan-adjustment-banner";
import { FactorBreakdown } from "@/components/evaluation/factor-breakdown";
import { RecommendationList } from "@/components/evaluation/recommendation-list";
import { EvaluationHistoryList } from "@/components/evaluation/evaluation-history-list";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import type { TripDetailDto } from "@/lib/mappers/trip-dto";

export default function DemoTripResultPage() {
  const mockParkName = "อุทยานแห่งชาติดอยอินทนนท์";
  const mockParkProvince = "เชียงใหม่";

  const mockTrip: TripDetailDto = {
    id: "trip-demo-1",
    tripDate: "2026-12-15T00:00:00.000Z",
    departAt: "07:00",
    originText: "ตัวเมืองเชียงใหม่",
    originLat: 18.7883,
    originLng: 98.9853,
    transportMode: "CAR",
    travelerCount: 2,
    weatherCondition: "CLEAR",
    estimatedTravelMinutes: 105,
    mockSunsetTime: "17:55",
    notes: null,
    status: "EVALUATED",
    createdAt: "2026-08-06T14:30:00.000Z",
    updatedAt: "2026-08-06T14:30:00.000Z",
    park: {
      id: "park-demo-1",
      nameTh: mockParkName,
      nameEn: "Doi Inthanon National Park",
      province: mockParkProvince,
      openTime: "05:30",
      closeTime: "16:30",
      coverImageUrl: "/images/parks/doi-inthanon.jpg",
    },
    evaluations: [
      {
        id: "eval-demo-1",
        tripId: "trip-demo-1",
        totalScore: 88,
        level: "EXCELLENT",
        weatherScore: 95,
        durationScore: 85,
        timeScore: 85,
        userProfileScore: 85,
        summary:
          "แผนการเดินทางมีความเหมาะสมและปลอดภัยสูงมาก สภาพอากาศแจ่มใส ออกเดินทางช่วงเช้าทำให้มีเวลาทำกิจกรรมเพียงพอก่อนพระอาทิตย์ตกดิน",
        recommendation:
          "เตรียมเสื้อกันหนาวหนาพิเศษเนื่องจากยอดดอยมีอากาศเย็นจัด และตรวจเช็คระบบเบรกรถยนต์ก่อนขึ้นทางชัน",
        evaluatedAt: "2026-08-06T14:30:00.000Z",
        createdAt: "2026-08-06T14:30:00.000Z",
      },
    ],
    latestWeatherSnapshot: {
      id: "weather-demo-1",
      weatherCondition: "CLEAR",
      temperatureC: 18.5,
      createdAt: "2026-08-06T14:30:00.000Z",
    },
    latestRouteSnapshot: {
      id: "route-demo-1",
      distanceMeters: 92000,
      durationSeconds: 6300,
      createdAt: "2026-08-06T14:30:00.000Z",
    },
  };

  const mockFactorScores = [
    {
      key: "weather" as const,
      label: "สภาพอากาศ (Weather)",
      weightLabel: "น้ำหนัก 35%",
      score: 95,
      description: "ท้องฟ้าแจ่มใส ไม่มีกลุ่มฝน ทัศนวิสัยการขับขี่ดีเยี่ยม",
    },
    {
      key: "duration" as const,
      label: "ระยะเวลาเดินทาง (Duration)",
      weightLabel: "น้ำหนัก 25%",
      score: 85,
      description: "ระยะทาง 92 กม. ใช้เวลาประมาณ 1 ชม. 45 นาที เหมาะสมกับการเดินทางพักผ่อน",
    },
    {
      key: "time" as const,
      label: "ช่วงเวลาเดินทาง (Time)",
      weightLabel: "น้ำหนัก 20%",
      score: 85,
      description: "ออกเดินทาง 07:00 น. ถึงอุทยาน 08:45 น. มีเวลาเที่ยวชมกิ่วแม่ปานและกลับก่อนค่ำ",
    },
    {
      key: "userProfile" as const,
      label: "ความพร้อมผู้เดินทาง (User Profile)",
      weightLabel: "น้ำหนัก 20%",
      score: 85,
      description: "เดินทาง 2 คน ด้วยรถยนต์ส่วนตัว มีความยืดหยุ่นในการเดินทางสูง",
    },
  ];

  const mockRecommendations = [
    "ควรเตรียมเสื้อกันหนาวหนาพิเศษ เนื่องจากอุณหภูมิยอดดอยอินทนนท์อาจต่ำกว่า 10°C ในช่วงเช้าตื่นสาย",
    "ตรวจเช็คความพร้อมของระบบเบรก น้ำมันเครื่อง และ ลมยาง รถยนต์ส่วนตัวก่อนขึ้นทางลาดชันดอยสูง",
    "แนะนำเข้าชมเส้นทางศึกษาธรรมชาติกิ่วแม่ปานช่วงเช้า 09:00 - 11:00 น. เพื่อหลีกเลี่ยงหมอกหนาจัด",
  ];

  const mockHistory = [
    {
      id: "eval-demo-1",
      totalScore: 88,
      level: "EXCELLENT" as const,
      summary: "แผนปัจจุบัน: ออกเดินทาง 07:00 น. สภาพอากาศแจ่มใส มีเวลาเที่ยวชมกิ่วแม่ปานและกลับก่อนค่ำ",
      evaluatedAt: "2026-08-06T14:30:00.000Z",
      isLatest: true,
    },
    {
      id: "eval-demo-0",
      totalScore: 62,
      level: "MODERATE" as const,
      summary: "แผนเดิม: ออกเดินทาง 15:30 น. เสี่ยงถึงอุทยานใกล้เวลาพระอาทิตย์ตกและทัศนวิสัยลดลง",
      evaluatedAt: "2026-08-06T11:15:00.000Z",
      isLatest: false,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          compact
          eyebrow="ตัวอย่างผลประเมิน"
          title={`ผลประเมิน: ${mockParkName}`}
          description="ตัวอย่างการแสดงคะแนนความพร้อม สภาพอากาศ และคำแนะนำการเดินทาง"
          actions={
            <Link
              href="/trips/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>ลองประเมินทริปจริง</span>
              <span>🧭</span>
            </Link>
          }
        />

        <ScoreHeroCard
          parkName={mockParkName}
          parkProvince={mockParkProvince}
          evaluation={mockTrip.evaluations[0]}
        />

        {/* Actionable Plan Adjustment & Reasoning Banner */}
        <PlanAdjustmentBanner trip={mockTrip} />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="soft-card relative overflow-hidden rounded-[32px] sm:rounded-[34px] px-5 py-6 sm:px-7">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 text-sm">
                📋
              </span>
              <span className="guide-chip">Trip Snapshot</span>
            </div>

            <h2 className="mt-3.5 text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--foreground)]">
              ข้อมูลแผนที่ใช้ในการประเมิน
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              สรุปข้อมูลตัวแปรหลักที่ระบบนำมาวิเคราะห์คำนวณคะแนนความปลอดภัย
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                  <span>🗓️</span>
                  <span>วันออกเดินทาง</span>
                </div>
                <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                  15 ธันวาคม 2026
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">กำหนดการเดินทาง</p>
              </div>

              <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                  <span>⏰</span>
                  <span>เวลาออกเดินทาง</span>
                </div>
                <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                  07:00 น.
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">เวลาเริ่มออกจากต้นทาง</p>
              </div>

              <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                    <span>🌤️</span>
                    <span>สภาพอากาศอุทยาน</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold font-heading">
                    18.5°C
                  </span>
                </div>
                <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                  ท้องฟ้าแจ่มใส
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">Open-Meteo Live Forecast</p>
              </div>

              <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                    <span>🧭</span>
                    <span>ระยะเวลาเดินทาง</span>
                  </div>
                  <span className="rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold font-heading">
                    92 กม.
                  </span>
                </div>
                <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                  1 ชม. 45 นาที
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">OSRM Route Sync</p>
              </div>
            </div>
          </div>

          <RecommendationList items={mockRecommendations} />
        </section>

        <FactorBreakdown factors={mockFactorScores} />

        <EvaluationHistoryList history={mockHistory} />

        {/* Bottom Action Navigation */}
        <section className="soft-card rounded-[28px] p-4 sm:p-5 border border-slate-200/80 dark:border-emerald-500/20 bg-white/90 dark:bg-[#071712]/90 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
              <Link
                href="/trips"
                className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
                </svg>
                <span>กลับไปทริปของฉัน</span>
              </Link>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
              <Link
                href="/trips/new"
                className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>สร้างทริปใหม่</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
