import type { ParkDetailDto } from "@/lib/mappers/park-dto";
import { getParkContactInfo } from "@/lib/data/park-addresses";

type ParkOfficialChannelBannerProps = {
  park: Pick<ParkDetailDto, "id" | "nameTh" | "nameEn" | "province"> & {
    slug?: string;
  };
};

export function getCleanParkName(nameTh: string) {
  return nameTh.startsWith("อุทยานแห่งชาติ")
    ? nameTh
    : `อุทยานแห่งชาติ${nameTh}`;
}

export function ParkOfficialChannelBanner({ park }: ParkOfficialChannelBannerProps) {
  const cleanParkName = getCleanParkName(park.nameTh);
  const contactInfo = getParkContactInfo(park.slug ?? park.id, park.nameTh, park.province);
  const facebookUrl = contactInfo.facebookUrl || `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanParkName)}`;

  return (
    <section className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-emerald-600/30 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-950/80 via-[#071d17]/90 to-slate-950/90 text-white shadow-lg shadow-emerald-950/20 backdrop-blur-xl">
      {/* Decorative ambient subtle glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] sm:text-xs font-semibold text-blue-200 border border-blue-400/30 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Official Channel</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-emerald-200/80">
              <span>📍</span>
              <span>จ.{park.province}</span>
            </span>
          </div>

          <h3 className="text-base sm:text-lg md:text-xl font-bold font-heading tracking-tight text-white leading-snug">
            ติดตามประกาศและข่าวสารสถานการณ์ล่าสุดจากอุทยาน
          </h3>

          <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/85">
            เนื่องจากสภาพอากาศ เส้นทางศึกษาธรรมชาติ และจุดกางเต็นท์อาจมีการปรับเปลี่ยนตามสถานการณ์หน้างาน ขอแนะนำให้ตรวจสอบประกาศทางการและภาพบรรยากาศสดรายวันได้ที่ Facebook Fanpage ทางการของ{" "}
            <strong className="text-white font-semibold underline decoration-emerald-400/60 decoration-1 underline-offset-2">
              {contactInfo.facebookName ?? cleanParkName}
            </strong>
          </p>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-emerald-300/80 pt-0.5">
            <span>💡</span>
            <span>ทริค: ดูโพสต์ล่าสุดเพื่อเช็กระดับน้ำตก สภาพหมอก และการเปิด-ปิดจุดท่องเที่ยวรายวัน</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex sm:self-center">
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-10 sm:h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full px-5 text-xs sm:text-sm font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] shadow-md shadow-blue-950/40 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            {/* Facebook Icon */}
            <svg className="h-4 w-4 fill-current shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>เปิด Facebook เพจทางการ</span>
            <svg className="h-3.5 w-3.5 text-blue-100 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
