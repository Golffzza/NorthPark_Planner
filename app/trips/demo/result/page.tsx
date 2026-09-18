import Link from "next/link";
import { ScoreHeroCard } from "@/components/evaluation/score-hero-card";
import { FactorBreakdown } from "@/components/evaluation/factor-breakdown";
import { RecommendationList } from "@/components/evaluation/recommendation-list";
import { EvaluationHistoryList } from "@/components/evaluation/evaluation-history-list";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

export default function DemoTripResultPage() {
  const mockParkName = "อุทยานแห่งชาติดอยอินทนนท์";
  const mockParkProvince = "เชียงใหม่";

  const mockEvaluation = {
    id: "eval-demo-1",
    tripId: "trip-demo-1",
    totalScore: 88,
    level: "EXCELLENT" as const,
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
          evaluation={mockEvaluation}
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
            <span className="guide-chip">Trip Snapshot</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              ข้อมูลแผนที่ใช้ในการประเมิน
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              สรุปข้อมูลตัวแปรหลักที่ระบบนำมาวิเคราะห์คำนวณคะแนนความปลอดภัย
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">วันเดินทาง</p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  15 ธันวาคม 2026
                </p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">เวลาออกเดินทาง</p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">07:00 น.</p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">สภาพอากาศของอุทยาน</p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  ท้องฟ้าแจ่มใส
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">18.5°C (Open-Meteo Sync)</p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">ระยะเวลาเดินทาง</p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  1 ชม. 45 นาที
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">92 กม. (OSRM Route Sync)</p>
              </div>
            </div>
          </div>

          <RecommendationList items={mockRecommendations} />
        </section>

        <FactorBreakdown factors={mockFactorScores} />

        <EvaluationHistoryList history={mockHistory} />
      </div>
    </AppShell>
  );
}
