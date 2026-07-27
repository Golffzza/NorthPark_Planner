import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const quickActions = [
  {
    title: "ค้นหาอุทยานที่ใช่",
    description: "สำรวจอุทยานในภาคเหนือแบบ travel guide พร้อมภาพ ป้ายหมวดหมู่ และเวลาเปิดปิด",
  },
  {
    title: "วางแผนทริปทีละขั้น",
    description: "กรอกวันเดินทาง จุดเริ่มต้น และข้อมูลสำคัญให้ครบใน planner ที่ออกแบบเพื่อหน้าจอมือถือ",
  },
  {
    title: "เช็กความพร้อมก่อนออกทริป",
    description: "ดูคะแนนความเหมาะสม ปัจจัยเสี่ยง และคำแนะนำสั้น ๆ เพื่อช่วยตัดสินใจก่อนเดินทางจริง",
  },
];

const companionNotes = [
  "ออกแบบให้ใช้สะดวกทั้งใน LINE MINI App และ browser ปกติ",
  "เน้นข้อมูลอุทยาน จุดเด่น คำเตือน และ trip safety ใน flow เดียว",
  "อ่านง่าย กดง่าย และพร้อมใช้บนมือถือระหว่างวางแผนจริง",
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="glass-panel app-section overflow-hidden rounded-[38px] px-5 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <div className="deep-card nature-hero-mesh rounded-[34px] px-5 py-6 sm:px-7 sm:py-7">
              <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/90">
                Nature Companion
              </span>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                วางแผนเที่ยวอุทยานแบบสบายตา แต่คิดเรื่องความปลอดภัยให้ครบ
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                NorthPark_Planner คือผู้ช่วยวางแผนทริปอุทยานแห่งชาติภาคเหนือในโทน Forest Glass
                ที่รวมการค้นหาอุทยาน การวางแผน และการประเมินความเหมาะสมไว้ในประสบการณ์เดียว
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/parks"
                  className="inline-flex items-center justify-center rounded-full border border-white/90 bg-white px-6 py-3.5 text-sm font-semibold !text-[#0B2F24] shadow-[0_12px_24px_rgba(18,44,38,0.18)]"
                >
                  สำรวจอุทยาน
                </Link>
                <Link
                  href="/trips/new"
                  className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm"
                >
                  เริ่มวางแผนทริป
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <section className="soft-card rounded-[34px] p-4 sm:p-5">
                <div className="park-media-placeholder relative overflow-hidden rounded-[28px] px-5 py-6">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,55,47,0.04),rgba(19,55,47,0.36))]" />
                  <div className="relative">
                    <span className="guide-chip bg-white/84">Featured Park</span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--forest-deep)]">
                      ดอยอินทนนท์
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--foreground)]/76">
                      large hero สำหรับอุทยานเด่น พร้อมเชื่อมไปยังรายละเอียด จุดเด่น และ flow
                      การวางแผนทริปต่อได้ทันที
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {companionNotes.map((item) => (
                    <div key={item} className="dashboard-card rounded-[24px] px-4 py-4">
                      <p className="text-sm leading-7 text-[var(--foreground)]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
            <p className="text-sm font-medium text-[var(--muted)]">Trip Safety Flow</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              ใช้งานเหมือน companion app สำหรับการเตรียมทริปอุทยาน
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              ทุกหน้าถูกจัดให้รองรับมือถือเป็นหลัก มี safe area spacing ที่เหมาะกับ LINE MINI App
              และยังเปิดใช้งานได้ดีใน browser ปกติสำหรับเดโมหรือใช้งานนอก LINE
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((item, index) => (
              <article key={item.title} className="soft-card rounded-[32px] px-5 py-5">
                <span className="guide-chip">{`Step 0${index + 1}`}</span>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
