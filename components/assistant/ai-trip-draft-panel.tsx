"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";
import type { TripDraftEdit } from "@/lib/chat-v2/state/trip-draft-edit";
import { emptyOrigin, type OriginChoice } from "@/lib/services/origin-selection";
import { OptionalOriginPicker } from "./optional-origin-picker";
import { readAssistantTripDraft, submitAssistantDraftMutation } from "./trip-draft-requests";

type Props = {
  conversationId: string;
  draft: AssistantV2DraftTrip;
  onChange: (draft: AssistantV2DraftTrip | null) => void;
};

export function AiTripDraftPanel({ conversationId, draft, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [durationInput, setDurationInput] = useState(String(draft.durationDays));
  const [durationDirty, setDurationDirty] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const [draftMissing, setDraftMissing] = useState(false);
  const [error, setError] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [departAt, setDepartAt] = useState("");
  const [origin, setOrigin] = useState<OriginChoice>(emptyOrigin);
  const [transportMode, setTransportMode] = useState("");
  const [travelerCount, setTravelerCount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => { if (!durationDirty) setDurationInput(String(draft.durationDays)); }, [draft.durationDays, durationDirty]);
  useEffect(() => { setConfirmed(false); }, [draft.draftId, draft.revision]);

  async function submitAction(method: "PATCH" | "DELETE" | "POST", extra: Record<string, unknown>) {
    if (!draft.draftId || !draft.revision || conflicted) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitAssistantDraftMutation(method, {
        conversationId, draftId: draft.draftId, revision: draft.revision, ...extra,
      });
      if (result.status === "CONFLICT") {
        setConfirmed(false);
        if (result.draft === null) {
          setConflicted(true);
          setDraftMissing(true);
          setError("แผนฉบับร่างนี้ไม่มีอยู่บนเซิร์ฟเวอร์แล้ว ข้อมูลเดินทางที่กรอกไว้ยังแสดงอยู่ กรุณาตรวจและปิดแผนเก่าเมื่อพร้อม");
        } else if (result.draft !== undefined) {
          onChange(result.draft);
          setConflicted(false);
          setDraftMissing(false);
          setError("แผนถูกแก้จากที่อื่นแล้ว โหลดฉบับล่าสุดให้แล้ว กรุณาตรวจแผนและส่งการแก้ไขอีกครั้ง ข้อมูลเดินทางที่กรอกไว้ยังอยู่");
        } else {
          setConflicted(true);
          setError("แผนถูกแก้จากที่อื่นแล้ว แต่ยังโหลดฉบับล่าสุดไม่ได้ กรุณากดโหลดแผนล่าสุดก่อนทำต่อ");
        }
        return;
      }
      if (result.status === "ERROR") throw new Error(result.message);
      if (method === "DELETE") onChange(null);
      else if (method === "POST") onChange({ ...draft, savedTripId: (result.data as { id: string }).id });
      else {
        if (extra.edit && (extra.edit as TripDraftEdit).operation === "SET_DURATION") setDurationDirty(false);
        onChange(result.data as AssistantV2DraftTrip);
      }
      setConfirmed(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ดำเนินการไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function refreshConflictedDraft() {
    setBusy(true);
    try {
      const latest = await readAssistantTripDraft(conversationId);
      if (!latest) {
        setDraftMissing(true);
        setError("แผนฉบับร่างนี้ไม่มีอยู่บนเซิร์ฟเวอร์แล้ว ข้อมูลเดินทางที่กรอกไว้ยังแสดงอยู่ กรุณาตรวจและปิดแผนเก่าเมื่อพร้อม");
        return;
      }
      onChange(latest);
      setConflicted(false);
      setDraftMissing(false);
      setConfirmed(false);
      setError("โหลดแผนล่าสุดแล้ว กรุณาตรวจแผนและส่งการแก้ไขอีกครั้ง ข้อมูลเดินทางที่กรอกไว้ยังอยู่");
    } catch {
      setError("ยังโหลดแผนล่าสุดไม่ได้ กรุณาลองใหม่");
    } finally { setBusy(false); }
  }

  const edit = (change: TripDraftEdit) => void submitAction("PATCH", { edit: change });

  function save(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || busy || conflicted) return;
    void submitAction("POST", {
      confirmed: true,
      travelDetails: {
        tripDate,
        departAt,
        originText: origin.text || undefined,
        originLat: origin.lat ?? undefined,
        originLng: origin.lng ?? undefined,
        transportMode,
        travelerCount: travelerCount ? Number(travelerCount) : undefined,
      },
    });
  }

  const fieldClass = "w-full rounded-xl border border-emerald-500/30 bg-[#071e17] px-3 py-2 text-sm text-white";
  const buttonClass = "rounded-lg border border-emerald-500/30 px-2 py-1 text-xs text-emerald-100 disabled:opacity-40";

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/70 p-4 text-emerald-50" aria-label="แผนทริปฉบับร่าง">
      <h2 className="font-bold">แผนฉบับร่าง: {draft.park.name}</h2>
      <p className="mt-1 text-xs text-emerald-200/70">ยังไม่บันทึกในทริปของฉัน · ลำดับกิจกรรมเป็นร่าง ไม่ได้คำนวณเวลาเดินทางระหว่างจุด</p>
      {draft.savedTripId ? (
        <Link className="mt-3 inline-block text-sm font-semibold text-emerald-300 underline" href={`/trips/${draft.savedTripId}/result`}>เปิดทริปที่บันทึกแล้ว</Link>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <label htmlFor="draft-days">จำนวนวัน</label>
            <input id="draft-days" className="w-16 rounded-lg bg-emerald-900 px-2 py-1" type="number" min="1" max="14" value={durationInput} disabled={busy || conflicted} onChange={(event) => { setDurationInput(event.target.value); setDurationDirty(true); }} />
            <button className={buttonClass} type="button" disabled={busy || conflicted || Number(durationInput) === draft.durationDays || !Number.isInteger(Number(durationInput)) || Number(durationInput) < 1 || Number(durationInput) > 14} onClick={() => edit({ operation: "SET_DURATION", durationDays: Number(durationInput) })}>ปรับจำนวนวัน</button>
          </div>
          <div className="mt-3 space-y-3">
            <h3 className="text-sm font-semibold">ทบทวนกิจกรรมรายวัน</h3>
            {draft.days.map((day) => (
              <div className="rounded-xl border border-emerald-500/15 p-3" key={day.day}>
                <h3 className="text-sm font-semibold">{day.title}</h3>
                <ol className="mt-2 space-y-1 text-sm">
                  {day.items.map((name, index) => (
                    <li className="flex flex-wrap items-center gap-1" key={`${day.day}-${index}-${name}`}>
                      <span className="min-w-0 flex-1">{index + 1}. {name}</span>
                      <button className={buttonClass} disabled={busy || conflicted || index === 0} onClick={() => edit({ operation: "MOVE_ACTIVITY", fromDay: day.day, fromPosition: index + 1, toDay: day.day, toPosition: index })} type="button" aria-label={`เลื่อน ${name} ขึ้น`}>↑</button>
                      <button className={buttonClass} disabled={busy || conflicted || index === day.items.length - 1} onClick={() => edit({ operation: "MOVE_ACTIVITY", fromDay: day.day, fromPosition: index + 1, toDay: day.day, toPosition: index + 2 })} type="button" aria-label={`เลื่อน ${name} ลง`}>↓</button>
                      {draft.days.length > 1 && <select className="rounded-lg bg-emerald-900 px-1 py-1 text-xs" disabled={busy || conflicted} value={day.day} aria-label={`ย้าย ${name} ไปวันอื่น`} onChange={(event) => edit({ operation: "MOVE_ACTIVITY", fromDay: day.day, fromPosition: index + 1, toDay: Number(event.target.value), toPosition: draft.days[Number(event.target.value) - 1].items.length + 1 })}>{draft.days.map((destination) => <option key={destination.day} value={destination.day}>วัน {destination.day}</option>)}</select>}
                      <button className={buttonClass} disabled={busy || conflicted} onClick={() => { if (window.confirm(`ลบกิจกรรม ${name} จากวันที่ ${day.day} ใช่ไหม?`)) edit({ operation: "REMOVE_ACTIVITY", day: day.day, position: index + 1 }); }} type="button" aria-label={`ลบ ${name}`}>ลบ</button>
                    </li>
                  ))}
                </ol>
                <select className="mt-2 max-w-full rounded-lg bg-emerald-900 px-2 py-1 text-xs" disabled={busy || conflicted} value="" aria-label={`เพิ่มกิจกรรมวันที่ ${day.day}`} onChange={(event) => { if (event.target.value) edit({ operation: "ADD_ACTIVITY", day: day.day, activityName: event.target.value }); }}>
                  <option value="">เพิ่มกิจกรรมที่มีข้อมูลรองรับ…</option>
                  {draft.verifiedActivities?.map((activity) => <option key={activity.name} value={activity.name}>{activity.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs text-red-200 underline disabled:opacity-40" type="button" disabled={busy || conflicted} onClick={() => {
            if (window.confirm("ยกเลิกแผนฉบับร่างนี้ใช่ไหม?")) void submitAction("DELETE", { confirmed: true });
          }}>ยกเลิกแผนฉบับร่าง</button>

          <form className="mt-5 space-y-3 border-t border-emerald-500/25 pt-4" onSubmit={save}>
            <h3 className="text-sm font-bold">ข้อมูลเดินทาง (ไม่บังคับ)</h3>
            <p className="text-xs text-emerald-200/70">บันทึกแผนก่อน แล้วเติมข้อมูลที่ยังไม่ทราบภายหลังได้ การประเมินจะเริ่มเมื่อข้อมูลพร้อม</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs">วันที่เดินทาง<input className={fieldClass} type="date" value={tripDate} disabled={busy || conflicted} onChange={(event) => { setTripDate(event.target.value); setConfirmed(false); }} /></label>
              <label className="text-xs">เวลาออกเดินทาง<input className={fieldClass} type="time" value={departAt} disabled={busy || conflicted} onChange={(event) => { setDepartAt(event.target.value); setConfirmed(false); }} /></label>
              <OptionalOriginPicker value={origin} disabled={busy || conflicted} onChange={(next) => { setOrigin(next); setConfirmed(false); }} />
              <label className="text-xs">พาหนะ<select className={fieldClass} value={transportMode} disabled={busy || conflicted} onChange={(event) => { setTransportMode(event.target.value); setConfirmed(false); }}><option value="">ยังไม่ระบุ</option><option value="CAR">รถยนต์</option><option value="MOTORCYCLE">รถจักรยานยนต์</option><option value="PUBLIC_TRANSPORT">ขนส่งสาธารณะ</option><option value="OTHER">อื่น ๆ</option></select></label>
              <label className="text-xs">จำนวนผู้เดินทาง<input className={fieldClass} type="number" min="1" value={travelerCount} disabled={busy || conflicted} onChange={(event) => { setTravelerCount(event.target.value); setConfirmed(false); }} /></label>
            </div>
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} disabled={busy || conflicted} onChange={(event) => setConfirmed(event.target.checked)} />ตรวจแผน กิจกรรม และข้อมูลเดินทางที่ระบุแล้ว ยืนยันบันทึกเป็นทริปของฉัน</label>
            <button className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950 disabled:opacity-40" disabled={!confirmed || busy || conflicted} type="submit">{busy ? "กำลังบันทึก…" : "ยืนยันและบันทึกทริป"}</button>
          </form>
        </>
      )}
      {error && <p className="mt-3 text-xs text-red-300" role="alert">{error}</p>}
      {conflicted && <div className="mt-2 flex gap-3 text-xs text-emerald-200">
        <button className="underline" type="button" disabled={busy} onClick={() => void refreshConflictedDraft()}>โหลดแผนล่าสุด</button>
        {draftMissing && <button className="underline" type="button" disabled={busy} onClick={() => onChange(null)}>ปิดแผนเก่า</button>}
      </div>}
    </section>
  );
}
