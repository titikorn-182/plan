"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  ArrowLeft,
  CircleDollarSign,
  Landmark,
  LoaderCircle,
  ReceiptText,
  Save,
} from "lucide-react";
import { saveDisbursementAction } from "@/features/disbursements/actions";
import type { OperationState } from "@/features/shared/action-state";
import {
  FieldError,
  FieldLabel,
  FormNotice,
  FormTopbar,
  fieldClass,
} from "@/components/ui/operation-form";
import { ProgressBar, RegisterSection } from "@/components/ui/module-primitives";
import type { DisbursementFormOptions } from "@/features/disbursements/types";
import { formatThaiNumber } from "@/features/shared/formatters";

export function DisbursementForm({ options }: { options: DisbursementFormOptions }) {
  const [state, action, pending] = useActionState(
    saveDisbursementAction,
    {} satisfies OperationState,
  );
  const [projectId, setProjectId] = useState(options.projects[0]?.id ?? "");
  const selected = useMemo(
    () => options.projects.find((item) => item.id === projectId),
    [options.projects, projectId],
  );
  const remaining = Math.max(0, (selected?.approvedBudget ?? 0) - (selected?.disbursedAmount ?? 0));
  const usedPercent = selected?.approvedBudget
    ? (selected.disbursedAmount / selected.approvedBudget) * 100
    : 0;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="budget-request-form pb-24">
      <input
        type="hidden"
        name="fiscalYearId"
        value={selected?.fiscalYearId ?? options.fiscalYears[0]?.id ?? ""}
      />
      <FormTopbar backHref="/disbursements" backLabel="กลับทะเบียนเบิกจ่าย" state={state} />
      <FormNotice state={state} idle="ระบบตรวจยอดคงเหลืออีกครั้งที่ฐานข้อมูลก่อนบันทึกทุกครั้ง" />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <RegisterSection
          title="บันทึกการเบิกจ่าย"
          aside={<span className="text-xs text-stone-500">หน่วย: บาท</span>}
        >
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
            <label className="md:col-span-2">
              <FieldLabel required>โครงการ</FieldLabel>
              <select
                className={fieldClass}
                name="projectId"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                required
                aria-invalid={Boolean(state.errors?.projectId?.length)}
                aria-describedby={
                  state.errors?.projectId?.length ? "disbursement-project-error" : undefined
                }
              >
                {options.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <FieldError id="disbursement-project-error" errors={state.errors?.projectId} />
            </label>
            <label>
              <FieldLabel required>ไตรมาส</FieldLabel>
              <select className={fieldClass} name="quarter" defaultValue="1">
                <option value="1">ไตรมาส 1</option>
                <option value="2">ไตรมาส 2</option>
                <option value="3">ไตรมาส 3</option>
                <option value="4">ไตรมาส 4</option>
              </select>
            </label>
            <label>
              <FieldLabel required>วันที่เบิกจ่าย</FieldLabel>
              <input
                className={fieldClass}
                name="disbursedOn"
                type="date"
                defaultValue={today}
                required
              />
            </label>
            <label>
              <FieldLabel required>ยอดเบิกจ่าย</FieldLabel>
              <input
                className={`${fieldClass} text-right text-base font-bold tabular-nums`}
                name="amount"
                type="number"
                min="0.01"
                max={remaining || undefined}
                step="0.01"
                required
                aria-invalid={Boolean(state.errors?.amount?.length)}
                aria-describedby={
                  state.errors?.amount?.length ? "disbursement-amount-error" : undefined
                }
              />
              <FieldError id="disbursement-amount-error" errors={state.errors?.amount} />
            </label>
            <label>
              <FieldLabel>เลขที่เอกสาร/ใบสำคัญ</FieldLabel>
              <input
                className={fieldClass}
                name="referenceNo"
                maxLength={120}
                placeholder="เช่น PV-70-001"
              />
            </label>
            <label className="md:col-span-2">
              <FieldLabel required>สถานะเอกสาร</FieldLabel>
              <select className={fieldClass} name="status" defaultValue="recorded">
                <option value="recorded">บันทึกแล้ว</option>
                <option value="reconciled">กระทบยอดแล้ว</option>
                <option value="pending_docs">รอเอกสาร</option>
                <option value="delayed">ล่าช้า</option>
              </select>
            </label>
          </div>
        </RegisterSection>
        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3">
            <h2 className="text-sm font-bold">สถานะวงเงินโครงการ</h2>
          </header>
          <div className="space-y-4 p-4 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">วงเงินอนุมัติ</span>
              <b>{formatThaiNumber(selected?.approvedBudget ?? 0)} บาท</b>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">เบิกจ่ายสะสม</span>
              <b>{formatThaiNumber(selected?.disbursedAmount ?? 0)} บาท</b>
            </div>
            <ProgressBar
              value={usedPercent}
              tone={usedPercent > 95 ? "red" : usedPercent > 75 ? "orange" : "green"}
            />
            <div className="border border-orange-200 bg-orange-50 p-4">
              <CircleDollarSign className="mb-2 text-[#c9440b]" size={20} />
              <span className="text-stone-600">วงเงินคงเหลือ</span>
              <strong className="mt-1 block text-xl text-[#9f3108] tabular-nums">
                {formatThaiNumber(remaining)} บาท
              </strong>
            </div>
            <p className="flex gap-2 text-stone-600">
              <Landmark size={16} />
              ยอดใหม่จะรวมเข้ากับยอดโครงการอัตโนมัติ
            </p>
            <p className="flex gap-2 text-stone-600">
              <ReceiptText size={16} />
              แนบใบสำคัญในเมนูหลักฐานหลังบันทึก
            </p>
          </div>
        </aside>
      </div>
      <div className="form-action-bar fixed right-0 bottom-0 left-[206px] z-40 flex min-h-16 items-center justify-between gap-3 border-t border-stone-300 bg-white px-4 py-3 shadow-[0_-4px_14px_rgba(28,25,23,0.08)] max-[960px]:left-[72px] max-[700px]:left-0 lg:px-8">
        <Link
          className="form-action-back inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold"
          href="/disbursements"
        >
          <ArrowLeft size={16} />
          <span>ยกเลิก</span>
        </Link>
        <button
          className="inline-flex min-h-10 items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
          บันทึกการเบิกจ่าย
        </button>
      </div>
    </form>
  );
}
