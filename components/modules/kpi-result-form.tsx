"use client";

import { useActionState, useMemo, useState } from "react";
import { Calculator, FileCheck2, Flag, ShieldCheck } from "lucide-react";
import { saveKpiResultAction, type OperationState } from "@/app/operations/actions";
import { FormActions, FieldError, FieldLabel, FormNotice, FormTopbar, areaClass, fieldClass } from "@/components/ui/operation-form";
import { ProgressBar, RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import type { KpiResultFormRecord } from "@/lib/domain";

export function KpiResultForm({ record }: { record: KpiResultFormRecord }) {
  const [state, action, pending] = useActionState(saveKpiResultAction, { id: record.id, version: record.version } as OperationState);
  const [actual, setActual] = useState(record.actual === null ? "" : String(record.actual));
  const ratio = useMemo(() => {
    if (actual === "" || record.target === 0) return 0;
    const value = Number(actual);
    return record.direction === "lower_is_better" ? (record.target / Math.max(value, 0.0001)) * 100 : (value / record.target) * 100;
  }, [actual, record.direction, record.target]);
  const editable = ["not_started", "draft", "revision_required"].includes(record.status);
  return (
    <form action={action} className="budget-request-form pb-24">
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="version" value={state.version ?? record.version} />
      <FormTopbar backHref="/kpi" backLabel="กลับ KPI Dashboard" state={state} />
      <FormNotice state={state} idle={editable ? "บันทึกผลจริงพร้อมคำอธิบาย แล้วส่งให้ผู้มีสิทธิ์รับรอง" : "ผลรายการนี้ถูกส่งหรือรับรองแล้ว จึงเปิดในโหมดอ่านอย่างเดียว"} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <RegisterSection title={`${record.code} · ${record.name}`} aside={<StatusPill tone={record.status === "verified" ? "green" : record.status === "revision_required" ? "red" : "orange"}>{record.status === "verified" ? "รับรองแล้ว" : record.status === "revision_required" ? "ต้องแก้ไข" : "อยู่ระหว่างจัดทำ"}</StatusPill>}>
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
            <div className="border border-stone-200 bg-stone-50 p-4"><FieldLabel>กรอบ / รุ่นเกณฑ์</FieldLabel><b className="mt-2 block text-sm">{record.framework} · {record.frameworkVersion}</b></div>
            <div className="border border-stone-200 bg-stone-50 p-4"><FieldLabel>เป้าหมาย</FieldLabel><b className="mt-2 block text-xl text-[#b53807] tabular-nums">{record.target.toLocaleString("th-TH")} {record.unit}</b></div>
            <div className="border border-stone-200 bg-stone-50 p-4 md:col-span-2"><FieldLabel>วิธีคำนวณ</FieldLabel><p className="mt-2 text-sm leading-6 text-stone-700">{record.calculationMethod}</p></div>
            <label><FieldLabel required>ผลจริง</FieldLabel><div className="relative"><input className={`${fieldClass} pr-20 text-right text-lg font-bold tabular-nums`} name="actual" type="number" step="any" value={actual} onChange={(event) => setActual(event.target.value)} disabled={!editable} required aria-invalid={Boolean(state.errors?.actual?.length)} aria-describedby={state.errors?.actual?.length ? "kpi-actual-error" : undefined} /><span className="pointer-events-none absolute top-1/2 right-3 mt-0.5 -translate-y-1/2 text-xs text-stone-500">{record.unit}</span></div><FieldError id="kpi-actual-error" errors={state.errors?.actual} /></label>
            <label><FieldLabel>ไตรมาสผลลัพธ์</FieldLabel><select className={fieldClass} name="quarter" defaultValue={record.quarter ?? ""} disabled={!editable}><option value="">ผลรายปี</option><option value="1">ไตรมาส 1</option><option value="2">ไตรมาส 2</option><option value="3">ไตรมาส 3</option><option value="4">ไตรมาส 4</option></select></label>
            <label className="md:col-span-2"><FieldLabel required>คำอธิบายผลและแหล่งข้อมูล</FieldLabel><textarea className={areaClass} name="explanation" defaultValue={record.explanation} disabled={!editable} maxLength={5000} placeholder="อธิบายผลจริง วิธีได้มาของข้อมูล และสาเหตุของช่องว่างจากเป้าหมาย" aria-invalid={Boolean(state.errors?.explanation?.length)} aria-describedby={state.errors?.explanation?.length ? "kpi-explanation-error" : undefined} /><FieldError id="kpi-explanation-error" errors={state.errors?.explanation} /></label>
          </div>
        </RegisterSection>
        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3"><h2 className="text-sm font-bold">ตัวอย่างการแปลผล</h2></header>
          <div className="space-y-4 p-4 text-xs"><div><div className="mb-2 flex items-end justify-between"><span className="text-stone-500">เทียบเป้าหมาย</span><b className={`text-lg ${ratio >= 100 ? "text-emerald-700" : ratio >= 90 ? "text-orange-700" : "text-red-700"}`}>{Math.min(999, ratio).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%</b></div><ProgressBar value={ratio} tone={ratio >= 100 ? "green" : ratio >= 90 ? "orange" : "red"} /></div><ul className="divide-y divide-stone-200 border-y border-stone-200"><li className="flex gap-3 py-3"><Calculator className="text-sky-700" size={17} />คำนวณสถานะอัตโนมัติจากทิศทางของตัวชี้วัด</li><li className="flex gap-3 py-3"><FileCheck2 className="text-emerald-700" size={17} />มีหลักฐาน {record.evidenceCount} ไฟล์</li><li className="flex gap-3 py-3"><ShieldCheck className="text-[#c9440b]" size={17} />ผู้รับรองเป็นผู้อนุมัติผลสุดท้าย</li></ul><p className="flex gap-2 leading-5 text-stone-600"><Flag className="mt-0.5 shrink-0" size={16} />ผลตัวอย่างบนหน้านี้ยังไม่เขียนฐานข้อมูลจนกดบันทึก</p></div>
        </aside>
      </div>
      {editable ? <FormActions pending={pending} backHref="/kpi" submitLabel="ส่งรับรองผล" /> : null}
    </form>
  );
}
