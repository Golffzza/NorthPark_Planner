"use client";

import { useState } from "react";
import type { OriginPlace } from "@/lib/services/origin-geocoding-service";
import { emptyOrigin, manualOrigin, requestGpsOrigin, searchedOrigin, type OriginChoice } from "@/lib/services/origin-selection";

type Props = { value: OriginChoice; onChange: (next: OriginChoice) => void; disabled?: boolean };

export function OptionalOriginPicker({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OriginPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function useGps() {
    if (!navigator.geolocation) { setMessage("อุปกรณ์นี้ไม่รองรับ GPS"); return; }
    setBusy(true);
    setMessage("กำลังระบุตำแหน่ง…");
    void requestGpsOrigin(navigator.geolocation).then((choice) => {
      onChange(choice);
      setMessage("ใช้พิกัด GPS ที่อุปกรณ์ส่งมาแล้ว");
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถระบุตำแหน่งได้");
    }).finally(() => setBusy(false));
  }

  async function search() {
    if (query.trim().length < 3) { setMessage("กรุณากรอกคำค้นอย่างน้อย 3 ตัวอักษร"); return; }
    setBusy(true);
    setResults([]);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/origins/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error(response.status === 429 ? "มีการค้นหาถี่เกินไป กรุณาลองอีกครั้ง" : "ค้นหาสถานที่ไม่สำเร็จ กรุณาลองอีกครั้ง");
      const body: { data?: OriginPlace[] } = await response.json();
      const found = Array.isArray(body.data) ? body.data : [];
      setResults(found);
      if (found.length === 0) setMessage("ไม่พบสถานที่จากผู้ให้บริการ กรุณาลองคำค้นอื่น");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ค้นหาสถานที่ไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  const fieldClass = "w-full rounded-xl border border-emerald-500/30 bg-[#071e17] px-3 py-2 text-sm text-white";
  const buttonClass = "rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40";

  return <div className="space-y-2 sm:col-span-2">
    <label className="block text-xs" htmlFor="draft-origin">จุดเริ่มต้น (ไม่บังคับ)</label>
    <input id="draft-origin" className={fieldClass} value={value.text} disabled={disabled || busy}
      placeholder="เว้นว่างได้ หรือพิมพ์ชื่อจุดเริ่มต้น"
      onChange={(event) => { onChange(manualOrigin(event.target.value)); setMessage(""); }} />
    <div className="flex flex-wrap gap-2">
      <button className={buttonClass} type="button" disabled={disabled || busy} onClick={useGps}>ใช้ตำแหน่งปัจจุบัน</button>
      <button className={buttonClass} type="button" disabled={disabled || busy || value.source === "none"} onClick={() => { onChange(emptyOrigin); setMessage("ล้างจุดเริ่มต้นแล้ว"); }}>ไม่ระบุจุดเริ่มต้น</button>
    </div>
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="draft-origin-search">ค้นหาสถานที่เริ่มต้น</label>
      <input id="draft-origin-search" className={fieldClass} value={query} disabled={disabled || busy}
        placeholder="ค้นหาสถานที่ เช่น สถานีขนส่งพิษณุโลก" onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
      <button className={buttonClass} type="button" onClick={() => void search()} disabled={disabled || busy || query.trim().length < 3}>ค้นหา</button>
    </div>
    {results.length > 0 && <ul className="space-y-1" aria-label="ผลการค้นหาสถานที่">
      {results.map((place) => <li key={place.id}><button className="w-full rounded-lg border border-emerald-500/20 p-2 text-left text-xs hover:bg-emerald-900" type="button"
        disabled={disabled || busy} onClick={() => { onChange(searchedOrigin(place)); setResults([]); setMessage("เลือกสถานที่จากผลการค้นหาแล้ว"); }}>{place.name}</button></li>)}
    </ul>}
    {value.source !== "none" && <p className="text-xs text-emerald-200" aria-live="polite">เลือก: {value.text}{value.lat !== null && value.lng !== null ? ` · ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (${value.source === "gps" ? "GPS" : "ผลค้นหา"})` : " · ยังไม่มีพิกัด"}</p>}
    {message && <p className="text-xs text-amber-200" role="status">{message}</p>}
    <p className="text-[11px] text-emerald-200/60">ผลค้นหา © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> ผ่าน Nominatim · ค้นหาเมื่อกดปุ่มเท่านั้น</p>
  </div>;
}
