"use client";

import { useActionState } from "react";
import { CalendarDays, Check, LoaderCircle } from "lucide-react";
import { selectReportingPeriodAction } from "@/features/shared/period-actions";
import type { FiscalYearOption, ReportingPeriod } from "@/features/shared/types";

export function PeriodSelector({
  fiscalYears,
  period,
}: {
  fiscalYears: FiscalYearOption[];
  period: ReportingPeriod;
}) {
  const [state, action, pending] = useActionState(selectReportingPeriodAction, {});
  const canSelect = fiscalYears.length > 0;

  return (
    <form action={action} className="period-selector" aria-label="เลือกรอบข้อมูล">
      <label>
        <span className="sr-only">ปีงบประมาณ</span>
        <select
          aria-label="ปีงบประมาณ"
          name="fiscalYearId"
          defaultValue={period.fiscalYearId ?? ""}
          disabled={!canSelect || pending}
        >
          {!canSelect ? <option value="">{period.fiscalYearLabel}</option> : null}
          {fiscalYears.map((year) => (
            <option key={year.id} value={year.id}>
              ปีงบประมาณ {year.buddhistYear}
            </option>
          ))}
        </select>
        <CalendarDays size={15} aria-hidden="true" />
      </label>
      <label>
        <span className="sr-only">ไตรมาส</span>
        <select aria-label="ไตรมาส" name="quarter" defaultValue={period.quarter} disabled={pending}>
          {[1, 2, 3, 4].map((quarter) => (
            <option value={quarter} key={quarter}>
              ไตรมาส {quarter}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={!canSelect || pending}
        aria-label={pending ? "กำลังเปลี่ยนรอบข้อมูล" : "ใช้รอบนี้"}
      >
        {pending ? (
          <LoaderCircle className="animate-spin motion-reduce:animate-none" size={14} />
        ) : (
          <Check className="period-selector-button-icon" size={14} aria-hidden="true" />
        )}
        <span className="period-selector-button-copy">
          {pending ? "กำลังเปลี่ยน" : "ใช้รอบนี้"}
        </span>
      </button>
      {state.message ? (
        <span className="sr-only" role="status" aria-live="polite">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
