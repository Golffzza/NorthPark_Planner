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

const featuredAttractions = [
  {
    name: "จุดชมวิวกิ่วแม่ปาน",
    park: "อุทยานแห่งชาติดอยอินทนนท์",
    imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
    link: "/parks/doi-inthanon",
    tag: "ชมทะเลหมอกยามเช้า",
  },
  {
    name: "น้ำตกมณฑาธาร",
    park: "อุทยานแห่งชาติดอยสุเทพ-ปุย",
    imageUrl: "/images/attractions/mon-tha-than.jpg",
    link: "/parks/doi-suthep-pui",
    tag: "น้ำตกตาดหน้าผาสูง",
  },
  {
    name: "ยอดดอยผ้าห่มปก",
    park: "อุทยานแห่งชาติดอยผ้าห่มปก",
    imageUrl: "/images/attractions/doi-pha-hom-pok-peak.jpg",
    link: "/parks/doi-pha-hom-pok",
    tag: "สูงอันดับ 2 ของไทย",
  },
  {
    name: "น้ำตกเต่าดำ",
    park: "อุทยานแห่งชาติคลองวังเจ้า",
    imageUrl: "/images/parks/khlong-wang-chao.jpg",
    link: "/parks/khlong-wang-chao",
    tag: "น้ำตกตาดชั้นสูง",
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="glass-panel app-section overflow-hidden rounded-[38px] p-3 sm:p-5">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            {/* Left Hero Card with Rich Nature Overlay */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[34px] bg-[#05241b] px-6 py-8 sm:px-8 sm:py-10 text-white shadow-xl">
              {/* Background Nature Image - Sharp and Clear */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                style={{ backgroundImage: `url('/images/parks/doi-luang.jpg')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#021812]/92 via-[#04221a]/70 to-[#04221a]/30" />

              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#031d16]/85 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/40 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Nature Companion • Northern Thailand
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl leading-tight drop-shadow-sm">
                  วางแผนเที่ยวอุทยานแบบสบายตา คิดเรื่องความปลอดภัยให้ครบ
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-slate-100 font-medium sm:text-base drop-shadow-xs">
                  NorthPark_Planner คือผู้ช่วยวางแผนทริปอุทยานแห่งชาติภาคเหนือในโทน Forest Glass
                  ที่รวมการค้นหาอุทยาน การวางแผนทริป และประเมินความเหมาะสมล่วงหน้าไว้ในที่เดียว
                </p>
              </div>

              <div className="relative z-10 mt-8 space-y-6">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/parks"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold !text-[#04221a] shadow-lg transition-all hover:bg-emerald-50 active:scale-95"
                  >
                    <span className="!text-[#04221a] font-extrabold">สำรวจ 20+ อุทยาน</span>
                    <span>🌲</span>
                  </Link>
                  <Link
                    href="/trips/new"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 bg-[#031d16]/75 px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#031d16]/90 active:scale-95"
                  >
                    <span>เริ่มวางแผนทริป</span>
                    <span>🧭</span>
                  </Link>
                </div>

                {/* Stat Counters */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/25 pt-5 text-center sm:text-left">
                  <div>
                    <p className="text-xl font-bold text-white sm:text-2xl drop-shadow-xs">20+</p>
                    <p className="text-[11px] font-medium text-emerald-200">อุทยานภาคเหนือ</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white sm:text-2xl drop-shadow-xs">100%</p>
                    <p className="text-[11px] font-medium text-emerald-200">ฟรีไม่มีค่าบริการ</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white sm:text-2xl drop-shadow-xs">Live</p>
                    <p className="text-[11px] font-medium text-emerald-200">ประเมินความพร้อม</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Featured Park Showcase & Highlights */}
            <div className="flex flex-col gap-4">
              {/* Main Featured Park Card */}
              <Link
                href="/parks/doi-luang"
                className="group relative flex flex-col justify-end overflow-hidden rounded-[34px] min-h-[220px] p-6 shadow-md transition-transform duration-300 hover:scale-[1.01]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('/images/parks/doi-luang.jpg')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-full bg-emerald-500/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      Featured Park • ดอยหลวง
                    </span>
                    <span className="text-xs font-semibold text-white/80 group-hover:translate-x-1 transition-transform">
                      รายละเอียด →
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
                    อุทยานแห่งชาติดอยหลวง
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                    ผืนป่าดงดิบอันสมบูรณ์ครอบคลุม 3 จังหวัด เชียงราย พะเยา และลำปาง พร้อมน้ำตกปูแกงและจุดชมวิวทิวทัศน์ธรรมชาติ
                  </p>
                </div>
              </Link>

              {/* Featured Attractions Grid */}
              <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                {featuredAttractions.map((att) => (
                  <Link
                    key={att.name}
                    href={att.link}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] min-h-[145px] p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url('${att.imageUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/10" />

                    <div className="relative z-10 flex items-start justify-start">
                      <span className="inline-block rounded-full bg-slate-950/75 border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                        {att.tag}
                      </span>
                    </div>

                    <div className="relative z-10 mt-6">
                      <p className="text-sm font-bold text-white leading-snug drop-shadow-xs">{att.name}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-300 drop-shadow-xs line-clamp-1">{att.park}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Steps / Guide Section */}
        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="soft-card rounded-[34px] px-5 py-6 sm:px-7 flex flex-col justify-center">
            <span className="guide-chip w-max">TRIP SAFETY FLOW</span>
            <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] leading-snug">
              ระบบผู้ช่วยวางแผนทริปอุทยานแบบครบวงจร
            </h2>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
              ออกแบบรองรับการใช้งานบนมือถือเป็นหลัก เหมาะสมกับ LINE MINI App และเบราว์เซอร์ทั่วไป พร้อมระบบประเมินความปลอดภัยล่วงหน้า
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((item, index) => (
              <article key={item.title} className="soft-card rounded-[32px] px-5 py-5 flex flex-col justify-between">
                <div>
                  <span className="guide-chip">{`Step 0${index + 1}`}</span>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-[var(--foreground)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
