import type { TripDetailDto } from "@/lib/mappers/trip-dto";

export function TripItinerary({ days }: { days: NonNullable<TripDetailDto["itineraryDays"]> }) {
  if (!days.length) return null;
  return (
    <section className="soft-card rounded-[28px] p-5 sm:p-6" aria-label="กำหนดการรายวัน">
      <h2 className="text-lg font-bold text-[var(--foreground)]">กำหนดการรายวัน</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">กิจกรรมเรียงตามแผนที่บันทึกไว้ ยังไม่ได้คำนวณเวลาเดินทางระหว่างจุด</p>
      <div className="mt-4 space-y-4">
        {days.map((day) => (
          <div key={day.day} className="rounded-2xl border border-emerald-500/20 p-4">
            <h3 className="font-semibold text-[var(--foreground)]">{day.title}</h3>
            {day.notes && <p className="mt-1 text-sm text-[var(--muted)]">{day.notes}</p>}
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--foreground)]">
              {day.items.map((item) => <li key={item.position}>{item.name}{item.notes ? ` — ${item.notes}` : ""}</li>)}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
