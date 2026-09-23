import { getParkContactInfo, getPrimaryPhone } from "@/lib/data/park-addresses";
import { getParkEvCharging } from "@/lib/data/park-ev-charging";
import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type ParkMapCardProps = {
  park: ParkDetailDto;
};

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function NavigationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function ParkMapCard({ park }: ParkMapCardProps) {
  const contactInfo = getParkContactInfo(park.slug, park.nameTh, park.province);
  const primaryPhoneDigits = getPrimaryPhone(contactInfo.phone);
  const lat = park.latitude ?? 18.5877;
  const lng = park.longitude ?? 98.4867;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;

  const bbox = {
    minLng: (lng - 0.025).toFixed(4),
    minLat: (lat - 0.02).toFixed(4),
    maxLng: (lng + 0.025).toFixed(4),
    maxLat: (lat + 0.02).toFixed(4),
  };

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLng}%2C${bbox.minLat}%2C${bbox.maxLng}%2C${bbox.maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <section id="park-contact-section" className="space-y-4" aria-labelledby="park-contact-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-strong)] shrink-0" />
          <h2 id="park-contact-heading" className="text-base sm:text-xl font-bold tracking-tight text-[var(--foreground)] whitespace-nowrap">
            ข้อมูลติดต่อ แผนที่ และการเดินทาง
          </h2>
        </div>
      </div>

      <div className="soft-card overflow-hidden rounded-[34px] p-4 sm:p-6 space-y-4">
        {/* Top Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/60 pb-3.5 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="guide-chip">{park.nameTh}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              จ.{park.province}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
            <CompassIcon className="h-3.5 w-3.5" />
            พิกัด: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
        </div>

        {/* 1. Facebook Fanpage Card */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-600/20 dark:via-blue-900/10 dark:to-transparent p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-md shadow-blue-500/30">
              <FacebookIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  contactInfo.facebookUrl
                    ? "bg-blue-500/20 dark:bg-blue-400/25 text-blue-700 dark:text-blue-300"
                    : "bg-amber-500/20 dark:bg-amber-400/25 text-amber-800 dark:text-amber-300"
                }`}>
                  {contactInfo.facebookUrl ? "เพจทางการ" : "ยังไม่มีเพจทางการ"}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-300/80 font-medium">
                  {contactInfo.facebookUrl ? "อัปเดตสภาพอากาศและเส้นทาง" : "โปรดติดต่อผ่านทางโทรศัพท์"}
                </span>
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Facebook แฟนเพจ
              </h3>
              <p className="mt-0.5 text-xs font-semibold text-blue-900 dark:text-blue-200 line-clamp-2">
                {contactInfo.facebookName ?? `${park.nameTh} - เพจทางการ`}
              </p>
            </div>
          </div>

          {contactInfo.facebookUrl ? (
            <a
              href={contactInfo.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition-all active:scale-95"
            >
              <FacebookIcon className="h-4 w-4" />
              <span>ไปยัง Facebook แฟนเพจ</span>
              <ExternalLinkIcon className="h-3.5 w-3.5 opacity-80" />
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 text-center">
              <span>ℹ️ อุทยานแห่งชาตินี้ยังไม่มีหน้าเพจ Facebook ทางการ (แนะนำให้โทรสอบถามที่ทำการ)</span>
            </div>
          )}
        </div>

        {/* 2. Visitor Center & Phone Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-600/20 dark:via-emerald-900/10 dark:to-transparent p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/30">
              <PhoneIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200">
                  ศูนย์บริการนักท่องเที่ยว
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-medium">
                  เวลา 08:30 - 16:30 น.
                </span>
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                เบอร์โทรศัพท์ติดต่อ
              </h3>
              <p className="mt-0.5 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                {contactInfo.phone ?? "053-000-000"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {primaryPhoneDigits ? (
              <a
                href={`tel:${primaryPhoneDigits}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:!text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all active:scale-95"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>โทรสอบถามทันที</span>
              </a>
            ) : null}
            <a
              href={contactInfo.websiteUrl ?? "https://nps.dnp.go.th"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs transition-all active:scale-95"
              title="ระบบจองบ้านพักและบริการ กรมอุทยานแห่งชาติ"
            >
              <GlobeIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <ExternalLinkIcon className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* 3. Park Office / Address Card */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent dark:from-teal-600/20 dark:via-teal-900/10 dark:to-transparent p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 dark:bg-teal-500 text-white shadow-md shadow-teal-600/30">
              <MapPinIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 dark:bg-teal-400/25 px-2.5 py-0.5 text-[11px] font-extrabold text-teal-800 dark:text-teal-200">
                  ที่ทำการอุทยาน
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-300/80 font-medium">
                  เปิดให้เข้าชม ทุกวัน {park.openTime} - {park.closeTime} น.
                </span>
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                ที่ตั้งศูนย์บริการและที่ทำการ
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed font-semibold text-slate-800 dark:text-slate-200">
                {contactInfo.address}
              </p>
            </div>
          </div>
        </div>

        {/* 4. EV Charging Station Info Card */}
        {(() => {
          const evCharging = getParkEvCharging(park.slug, park.nameTh);
          return (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-600/20 dark:via-emerald-950/20 dark:to-transparent p-4 flex flex-col justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/30">
                  <span className="text-lg">⚡</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                      evCharging.hasEvCharger
                        ? "bg-emerald-500/20 dark:bg-emerald-400/25 text-emerald-800 dark:text-emerald-200"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}>
                      {evCharging.badgeLabel}
                    </span>
                    {evCharging.provider ? (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 font-semibold">
                        เครือข่าย: {evCharging.provider}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {evCharging.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                    {evCharging.description}
                  </p>
                  {evCharging.chargerType ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                        🔌 {evCharging.chargerType}
                      </span>
                      {evCharging.locationHint ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          📍 {evCharging.locationHint}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Map Preview Canvas */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-emerald-200 px-1">
            <span className="flex items-center gap-1.5">
              <span>🗺️</span>
              <span>แผนที่ตำแหน่งอุทยาน</span>
            </span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-emerald-300/70">
              แตะเพื่อเลื่อนดูแผนที่
            </span>
          </div>

          <div className="relative h-52 sm:h-72 w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-inner dark:border-slate-800">
            <iframe
              title={`แผนที่ ${park.nameTh}`}
              width="100%"
              height="100%"
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              src={osmEmbedUrl}
            />
            <div className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-xs backdrop-blur-xs dark:bg-slate-900/90 dark:text-slate-200">
              📍 {park.nameTh}
            </div>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand-strong)] dark:bg-emerald-400 text-white dark:!text-slate-950 px-5 py-3 text-xs sm:text-sm font-extrabold shadow-md transition-all hover:opacity-90 active:scale-95"
          >
            <NavigationIcon className="h-4 w-4" />
            นำทางด้วย Google Maps
          </a>
          <a
            href={openStreetMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all hover:bg-white dark:hover:bg-slate-800 active:scale-95"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            เปิดแผนที่เต็มใน OpenStreetMap
          </a>
        </div>
      </div>
    </section>
  );
}
