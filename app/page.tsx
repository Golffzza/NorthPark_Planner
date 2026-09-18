import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const tripSteps = [
  {
    stepLabel: "ขั้นตอนที่ 1",
    title: "ค้นหาอุทยานที่อยากไป",
    description: "สำรวจอุทยานแห่งชาติภาคเหนือ ดูไฮไลท์ภาพถ่าย เวลาเปิด-ปิด และสิ่งอำนวยความสะดวก",
    href: "/parks",
    actionLabel: "ดูรายชื่ออุทยาน",
    iconBg: "from-emerald-500 to-teal-600",
    badgeColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-600/20",
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L4 15h5l-3 6h12l-3-6h5L12 3z" />
        <path d="M12 21v2" />
      </svg>
    ),
  },
  {
    stepLabel: "ขั้นตอนที่ 2",
    title: "ระบุวัน & วิธีเดินทาง",
    description: "เลือกวันที่ออกเดินทาง จุดเริ่มต้น และยานพาหนะ เพื่อคำนวณระยะทางและเวลาที่เหมาะสม",
    href: "/trips/new",
    actionLabel: "เริ่มสร้างทริป",
    iconBg: "from-teal-500 to-cyan-600",
    badgeColor: "bg-teal-500/15 text-teal-800 dark:text-teal-300 ring-teal-600/20",
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M12 14v4M10 16h4" />
      </svg>
    ),
  },
  {
    stepLabel: "ขั้นตอนที่ 3",
    title: "เช็กคะแนนความพร้อม",
    description: "รับผลประเมินความปลอดภัย สภาพอากาศล่วงหน้า และคำแนะนำเพื่อการเดินทางที่ราบรื่น",
    href: "/trips",
    actionLabel: "ดูทริปของฉัน",
    iconBg: "from-amber-500 to-emerald-600",
    badgeColor: "bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-600/20",
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
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
                  วางแผนเที่ยวอุทยานภาคเหนือ สะดวก ปลอดภัย มั่นใจทุกทริป
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-slate-100 font-medium sm:text-base drop-shadow-xs">
                  NorthPark คือผู้ช่วยวางแผนท่องเที่ยวอุทยานแห่งชาติภาคเหนือ ที่ช่วยคุณค้นหาจุดหมาย วางแผนเส้นทาง และประเมินความพร้อมล่วงหน้าได้ในที่เดียว
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
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight whitespace-nowrap truncate">
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
          <div className="soft-card relative overflow-hidden rounded-[32px] p-6 sm:p-7 flex flex-col justify-between border border-white/60 dark:border-emerald-800/40 shadow-sm backdrop-blur-xl bg-white/80 dark:bg-[#0b1c16]/85">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
                <span>✨</span>
                <span>เริ่มต้นง่าย ๆ ใน 3 ขั้นตอน</span>
              </div>
              <h2 className="mt-3.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                วางแผนเที่ยวอุทยานภาคเหนือ <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  ง่าย มั่นใจ ปลอดภัย
                </span>
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-emerald-200/80 font-normal">
                ระบบผู้ช่วยอัจฉริยะช่วยคุณสำรวจอุทยาน จัดตารางเดินทาง และประเมินสภาพอากาศพร้อมความเหมาะสมอัตโนมัติ
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-slate-200/60 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-emerald-200">
                🌤️ เช็กสภาพอากาศ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-emerald-200">
                ⏱️ คำนวณเวลาเดินทาง
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-emerald-200">
                🛡️ ประเมินความปลอดภัย
              </span>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            {tripSteps.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group soft-card relative flex flex-col justify-between rounded-[28px] p-5 border border-white/60 dark:border-emerald-800/40 shadow-sm backdrop-blur-xl bg-white/80 dark:bg-[#0b1c16]/85 transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${item.iconBg} shadow-md shadow-emerald-950/15`}>
                      {item.icon}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ring-1 ${item.badgeColor}`}>
                      {item.stepLabel}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-emerald-200/70 font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 pt-3 border-t border-slate-100 dark:border-white/5">
                  <span>{item.actionLabel}</span>
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
