"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Download, FileSearch, FileUp, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { reviewEvidenceAction, uploadEvidenceAction, type OperationState } from "@/app/operations/actions";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import type { AppRole, EvidenceEntityOption, EvidenceRow } from "@/lib/domain";

const entityLabel: Record<string, string> = { budget_request: "คำของบ", project: "โครงการ", quarterly_report: "รายงานไตรมาส", kpi_result: "ผล KPI" };

function EvidenceReview({ row }: { row: EvidenceRow }) {
  const [state, action, pending] = useActionState(reviewEvidenceAction, {} satisfies OperationState);
  return <form action={action} className="mt-3 border-t border-stone-200 pt-3"><input type="hidden" name="id" value={row.id} /><textarea className="min-h-16 w-full border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-orange-500" name="comment" placeholder="เหตุผลเมื่อส่งกลับแก้ไข" maxLength={1000} /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] ${state.success ? "text-emerald-700" : "text-red-700"}`} role="status" aria-live="polite">{state.message}</span><div className="flex gap-2"><button className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50" name="decision" value="return" disabled={pending}><RotateCcw size={13} />ส่งกลับ</button><button className="inline-flex items-center gap-1 bg-emerald-700 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50" name="decision" value="verify" disabled={pending}><CheckCircle2 size={13} />รับรอง</button></div></div></form>;
}

export function EvidenceView({ rows, entities, role }: { rows: EvidenceRow[]; entities: EvidenceEntityOption[]; role: AppRole }) {
  const [uploadState, uploadAction, uploading] = useActionState(uploadEvidenceAction, {} satisfies OperationState);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const selected = useMemo(() => entities.find((item) => item.id === entityId), [entities, entityId]);
  const verified = rows.filter((row) => row.verified).length;
  const canReview = role === "admin" || role === "user";
  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white sm:grid-cols-3"><article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0"><FileSearch className="text-sky-700" /><span><b className="block text-2xl">{rows.length}</b><small className="text-stone-500">หลักฐานทั้งหมด</small></span></article><article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0"><ShieldCheck className="text-emerald-700" /><span><b className="block text-2xl">{verified}</b><small className="text-stone-500">รับรองแล้ว</small></span></article><article className="flex items-center gap-4 p-5"><RotateCcw className="text-orange-700" /><span><b className="block text-2xl">{rows.length - verified}</b><small className="text-stone-500">รอตรวจสอบ</small></span></article></section>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <RegisterSection title="อัปโหลดหลักฐาน" aside={<FileUp size={18} className="text-[#c9440b]" />}>
          <form action={uploadAction} className="space-y-4 p-5">
            <input type="hidden" name="entityType" value={selected?.entityType ?? ""} /><input type="hidden" name="organizationId" value={selected?.organizationId ?? ""} />
            <label className="block"><FieldLabel required>ผูกกับรายการ</FieldLabel><select className={fieldClass} name="entityId" value={entityId} onChange={(event) => setEntityId(event.target.value)} required>{entities.map((item) => <option key={`${item.entityType}-${item.id}`} value={item.id}>{item.label}</option>)}</select></label>
            <label className="block"><FieldLabel required>ไฟล์หลักฐาน</FieldLabel><input className="mt-1.5 block w-full border border-dashed border-stone-300 bg-stone-50 p-4 text-xs file:mr-3 file:border-0 file:bg-[#cf430c] file:px-3 file:py-2 file:font-semibold file:text-white" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" required /></label>
            <p className="text-[11px] leading-5 text-stone-500">รองรับ PDF, JPG, PNG, XLSX และ CSV ขนาดไม่เกิน 20 MB ไฟล์ทั้งหมดเก็บใน private bucket</p>
            <FormNotice state={uploadState} idle="ตรวจชนิดและขนาดไฟล์ก่อนบันทึก metadata" />
            <button className="inline-flex w-full items-center justify-center gap-2 bg-[#cf430c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={uploading || entities.length === 0}>{uploading ? <LoaderCircle className="animate-spin" size={16} /> : <FileUp size={16} />}อัปโหลดหลักฐาน</button>
          </form>
        </RegisterSection>
        <RegisterSection title="ทะเบียนและการตรวจหลักฐาน" aside={<span className="text-xs text-stone-500">แสดงล่าสุด {rows.length} ไฟล์</span>}>
          <div className="grid gap-px bg-stone-200 md:grid-cols-2 2xl:grid-cols-3">{rows.map((row) => <article className="bg-white p-4" key={row.id}><div className="flex items-start justify-between gap-3"><span className="min-w-0"><small className="font-bold text-[#b53807]">{entityLabel[row.entityType] ?? row.entityType} · {row.businessId}</small><b className="mt-1 block truncate text-sm" title={row.fileName}>{row.fileName}</b></span><StatusPill tone={row.verified ? "green" : "orange"}>{row.verified ? "รับรองแล้ว" : "รอตรวจ"}</StatusPill></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-stone-600">{row.title}</p><dl className="mt-3 space-y-1 text-[11px] text-stone-500"><div className="flex justify-between gap-2"><dt>หน่วยงาน</dt><dd className="truncate text-right">{row.unit}</dd></div><div className="flex justify-between"><dt>ขนาดไฟล์</dt><dd>{(row.sizeBytes / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 2 })} MB</dd></div><div className="flex justify-between"><dt>อัปโหลด</dt><dd>{row.uploadedAt}</dd></div></dl><a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:underline" href={`/evidence/${row.id}/download`}><Download size={14} />ดาวน์โหลดแบบลงชื่อ</a>{canReview && !row.verified ? <EvidenceReview row={row} /> : null}</article>)}{rows.length === 0 ? <p className="bg-white p-8 text-center text-sm text-stone-500 md:col-span-2 2xl:col-span-3">ยังไม่มีหลักฐานในขอบเขตสิทธิ์</p> : null}</div>
        </RegisterSection>
      </div>
    </div>
  );
}
