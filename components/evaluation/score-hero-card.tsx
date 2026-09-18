import { SuitabilityLevelBadge } from "@/components/evaluation/suitability-level-badge";
import type { TripResultViewModel } from "@/lib/presenters/trip-result-view";
import { formatThaiDateTime } from "@/lib/utils/date";

type ScoreHeroCardProps = {
  parkName: string;
  parkProvince: string;
  evaluation: TripResultViewModel["latestEvaluation"];
};

export function ScoreHeroCard({ parkName, parkProvince, evaluation }: ScoreHeroCardProps) {
  return (
    <section className="soft-card overflow-hidden rounded-[38px] px-5 py-6 sm:px-7 sm:py-7">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="min-w-0">
          <span className="guide-chip">แดชบอร์ดคะแนนความปลอดภัย</span>
          <p className="mt-4 text-sm font-medium text-[var(--muted)]">{parkProvince}</p>
          <h2
            className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] leading-tight break-words"
            title={parkName}
          >
            {parkName}
          </h2>
          <div className="mt-4">
            <SuitabilityLevelBadge level={evaluation.level} />
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{evaluation.summary}</p>
          <div className="mt-5 dashboard-card rounded-[24px] px-4 py-4">
            <p className="text-sm text-[var(--muted)]">ประเมินเมื่อ</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {formatThaiDateTime(evaluation.evaluatedAt)}
            </p>
          </div>
        </div>

        <div className="deep-card rounded-[34px] px-5 py-6">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="score-ring" style={{ ["--score-angle" as string]: `${evaluation.totalScore * 3.6}deg` }}>
              <div className="score-ring-content">
                <p className="text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
                  {evaluation.totalScore}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">เต็ม 100 คะแนน</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">ระบบประเมินความปลอดภัยทริป</p>
              <p className="mt-2 text-base leading-7 text-white/82">
                ใช้คะแนนนี้เป็นภาพรวมของความพร้อมในการเดินทาง พร้อมดูสรุปคะแนนย่อยรายปัจจัยและคำแนะนำต่อด้านล่าง
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
