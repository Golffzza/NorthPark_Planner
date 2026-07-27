type ParkSearchBarProps = {
  defaultQuery?: string;
  defaultProvince?: string;
  provinces: string[];
};

export function ParkSearchBar({
  defaultQuery = "",
  defaultProvince = "",
  provinces,
}: ParkSearchBarProps) {
  return (
    <form className="glass-panel rounded-[32px] px-4 py-4 sm:px-5" action="/parks" method="get">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="guide-chip">Park Guide Search</span>
          <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
            ค้นหาอุทยานที่เหมาะกับบรรยากาศทริปของคุณ
          </p>
          <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
            ค้นจากชื่ออุทยาน จังหวัด หรือใช้ตัวกรองเพื่อไล่ดูจุดหมายในภาคเหนือแบบ travel guide
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_190px_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">คำค้นหา</span>
          <input
            type="search"
            name="q"
            defaultValue={defaultQuery}
            placeholder="เช่น ดอยอินทนนท์ เชียงใหม่ น้ำตก"
            className="form-control"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">จังหวัด</span>
          <select name="province" defaultValue={defaultProvince} className="form-control">
            <option value="">ทุกจังหวัด</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="glass-button h-14 flex-1 rounded-[22px] px-5 text-sm font-semibold sm:flex-none"
          >
            ค้นหา
          </button>
        </div>
      </div>
    </form>
  );
}
