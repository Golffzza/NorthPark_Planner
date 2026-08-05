import { getParkContactInfo } from "@/lib/data/park-addresses";
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

export function ParkMapCard({ park }: ParkMapCardProps) {
  const contactInfo = getParkContactInfo(park.slug, park.nameTh, park.province);
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
    <section className="space-y-4" aria-labelledby="park-map-heading">
      <div className="flex items-center gap-2">
        <MapPinIcon className="h-6 w-6 text-[var(--brand-strong)]" />
        <h2 id="park-map-heading" className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          แผนที่และการเดินทาง
        </h2>
      </div>

      <div className="soft-card overflow-hidden rounded-[34px] p-4 sm:p-6">
        {/* Top Badges */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/60 pb-3.5 dark:border-slate-800/60">
          <span className="guide-chip">{park.nameTh}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
            <CompassIcon className="h-3.5 w-3.5" />
            พิกัด: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
        </div>

        {/* Address & Contact Info */}
        <div className="mb-4 space-y-3">
          <div>
            <span className="inline-block rounded-md bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--brand-strong)]">
              ที่อยู่
            </span>
            <p className="mt-1.5 text-sm sm:text-base leading-relaxed font-semibold text-[var(--foreground)]">
              {contactInfo.address}
            </p>
          </div>

          {contactInfo.phone && (
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--muted)]">
              <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
              <div>
                <span className="block font-bold text-[var(--foreground)]">เบอร์โทรศัพท์ติดต่อ</span>
                <p className="mt-1 font-mono font-bold text-[var(--foreground)] leading-snug">
                  {contactInfo.phone}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Map Preview Canvas */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-inner dark:border-slate-800 my-4">
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

        {/* Navigation Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
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
