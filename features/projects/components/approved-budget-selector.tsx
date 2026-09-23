"use client";

import Link from "next/link";
import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { ProjectFormOptions } from "@/features/projects/types";
import type { ApprovedBudgetSourceControl } from "@/features/projects/hooks/use-approved-budget-source";
import { INPUT_LIMITS } from "@/lib/config/limits";

export function ApprovedBudgetSelector({
  options,
  source,
  title,
  setTitle,
  errors,
  disabled,
}: {
  options: ProjectFormOptions;
  source: ApprovedBudgetSourceControl;
  title: string;
  setTitle: (value: string) => void;
  errors?: Record<string, string[]>;
  disabled: boolean;
}) {
  const selected = options.budgetRequests.find((item) => item.id === source.budgetRequestId);
  const replacing = options.budgetRequests.find((item) => item.id === source.replacementId);
  const label = "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก";
  const buttonClass =
    "min-h-10 border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:border-orange-400 disabled:opacity-60";
  return (
    <div className="min-w-0 space-y-3 md:col-span-2">
      {source.mode === "approved" ? (
        <>
          <label className="block">
            <FieldLabel required>{label}</FieldLabel>
            <select
              className={fieldClass}
              name="approvedBudgetSelection"
              value={source.budgetRequestId}
              onChange={(event) => source.select(event.target.value)}
              disabled={disabled || source.loading || source.replacementId !== null}
              required
              aria-describedby="approved-budget-help approved-budget-error approved-budget-field-error approved-budget-title-error"
              aria-invalid={Boolean(
                source.error || errors?.budgetRequestId?.length || errors?.title?.length,
              )}
            >
              <option value="" disabled>
                เลือกกิจกรรมจากคำของบที่อนุมัติแล้ว
              </option>
              {source.budgetRequestId && !selected ? (
                <option value={source.budgetRequestId}>{title} · คำของบอ้างอิงเดิม</option>
              ) : null}
              {options.budgetRequests.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.code} ·{" "}
                  {options.fiscalYears.find((year) => year.id === item.fiscalYearId)?.label}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="title" value={title} />
          <p id="approved-budget-help" className="text-xs leading-5 text-stone-600">
            เลือกเพื่อเติมข้อมูลร่วมกันจากคำของบโดยอัตโนมัติ ทั้งหน่วยงาน ปีงบประมาณ ผู้รับผิดชอบ
            เหตุผล เป้าหมาย SDG ระยะเวลา และค่าใช้จ่าย จากนั้นตรวจและเติมข้อมูลเฉพาะข้อเสนอโครงการ
          </p>
          {!options.budgetRequests.length ? (
            <p className="text-sm leading-6 text-stone-700">
              ยังไม่มีคำของบที่อนุมัติแล้วในสิทธิ์ของคุณ ตรวจสถานะได้ที่{" "}
              <Link
                href="/budget-requests"
                className="font-semibold text-orange-800 underline underline-offset-4"
              >
                ทะเบียนคำของบ
              </Link>{" "}
              หรือเลือกกรอกเองโดยไม่อ้างอิงคำของบ
            </p>
          ) : null}
        </>
      ) : (
        <label className="block">
          <FieldLabel required>{label}</FieldLabel>
          <input
            className={fieldClass}
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={INPUT_LIMITS.title}
            aria-invalid={Boolean(errors?.title?.length)}
            aria-describedby="approved-budget-title-error"
            required
          />
        </label>
      )}
      <FieldError id="approved-budget-title-error" errors={errors?.title} />
      <FieldError id="approved-budget-field-error" errors={errors?.budgetRequestId} />
      <p className="text-sm text-stone-700">
        <b>อ้างอิงคำของบที่อนุมัติ:</b>{" "}
        {source.budgetRequestId ? (
          <Link
            href={`/budget-requests/${source.budgetRequestId}/edit`}
            className="break-words text-orange-800 underline underline-offset-4"
          >
            {selected?.code ?? options.record?.budgetRequestId ?? source.budgetRequestId}
          </Link>
        ) : (
          "ยังไม่อ้างอิงคำของบ"
        )}
      </p>
      {!disabled && !source.busy ? (
        <button
          className={buttonClass}
          type="button"
          onClick={() =>
            source.mode === "approved" ? source.select("") : source.useApprovedMode()
          }
        >
          {source.mode === "approved"
            ? "กรอกเองโดยไม่อ้างอิงคำของบ"
            : "เลือกจากคำของบที่อนุมัติแล้ว"}
        </button>
      ) : null}
      {source.loading ? (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <span className="text-sm text-stone-700">กำลังโหลดข้อมูลคำของบ กรุณารอสักครู่</span>
          <button className={buttonClass} type="button" onClick={source.cancel}>
            ยกเลิกการโหลด
          </button>
        </div>
      ) : null}
      {source.replacementId !== null ? (
        <div
          className="space-y-3 border border-orange-200 bg-orange-50 p-4"
          role="region"
          aria-label="ยืนยันเปลี่ยนคำของบอ้างอิง"
        >
          <p className="text-sm leading-6 text-orange-950">
            {source.replacementId
              ? `เปลี่ยนเป็น ${replacing?.code ?? "คำของบที่เลือก"} และแทนที่ข้อมูลข้อเสนอโครงการที่กรอกอยู่ด้วยข้อมูลคำขอนี้หรือไม่? ข้อมูลเฉพาะโครงการจะต้องกรอกใหม่ โดยเป้าหมายเบิกจ่ายยังคงเดิม`
              : "ยกเลิกการอ้างอิงคำของบหรือไม่? ข้อมูลที่กรอกไว้จะยังอยู่ทั้งหมด"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass} type="button" onClick={source.cancel}>
              ใช้ข้อมูลเดิม
            </button>
            <button
              className="min-h-10 bg-[#cf430c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ad3507]"
              type="button"
              onClick={source.confirm}
            >
              {source.replacementId ? "ยืนยันใช้ข้อมูลคำขอนี้" : "ยืนยันยกเลิกการอ้างอิง"}
            </button>
          </div>
        </div>
      ) : null}
      <div id="approved-budget-error" role="alert" className="text-sm text-red-700">
        {source.error}
      </div>
      {source.loadedCode ? (
        <div className="space-y-2 text-xs leading-5 text-stone-700" role="status">
          <p>
            เติมข้อมูลจาก {source.loadedCode} แล้ว กรุณาตรวจทานก่อนบันทึก
            การแก้ไขในหน้านี้ไม่เปลี่ยนคำของบต้นฉบับ
          </p>
          {source.warnings.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {source.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
