"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, FileCheck2, Gauge } from "lucide-react";
import { saveQuarterlyReportAction } from "@/features/quarterly-reports/actions";
import type { OperationState } from "@/features/shared/action-state";
import {
  FormActions,
  FieldError,
  FieldLabel,
  FormNotice,
  FormTopbar,
  areaClass,
  fieldClass,
} from "@/components/ui/operation-form";
import { ProgressBar, RegisterSection } from "@/components/ui/module-primitives";
import type { QuarterlyReportFormOptions } from "@/features/quarterly-reports/types";

export function QuarterlyReportForm({ options }: { options: QuarterlyReportFormOptions }) {
  const record = options.record;
  const initial: OperationState = { id: record?.id, version: record?.version };
  const [state, action, pending] = useActionState(saveQuarterlyReportAction, initial);
  const [projectId, setProjectId] = useState(record?.projectId ?? options.projects[0]?.id ?? "");
  const selectedProject = useMemo(
    () => options.projects.find((item) => item.id === projectId),
    [options.projects, projectId],
  );
  const [progress, setProgress] = useState(String(record?.progress ?? 0));
  const fiscalYearId =
    record?.fiscalYearId ?? selectedProject?.fiscalYearId ?? options.fiscalYears[0]?.id ?? "";
  const editable = !record || ["draft", "revision_required"].includes(record.status);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="budget-request-form pb-24">
      <input type="hidden" name="id" value={state.id ?? record?.id ?? ""} />
      <input type="hidden" name="version" value={state.version ?? record?.version ?? 1} />
      <input type="hidden" name="fiscalYearId" value={fiscalYearId} />
      <FormTopbar backHref="/reports/quarterly" backLabel="กลับทะเบียนรายงาน" state={state} />
      <FormNotice
        state={state}
        idle={
          editable
            ? "รายงานจะยังแก้ไขได้จนกว่าจะส่งตรวจ เมื่อส่งแล้วระบบจะล็อกเวอร์ชันนี้"
            : "รายงานนี้ถูกส่งตรวจหรือรับรองแล้ว จึงเปิดแบบอ่านอย่างเดียว"
        }
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <RegisterSection
          title={record ? `แก้ไขรายงานไตรมาส ${record.quarter}` : "บันทึกผลดำเนินงานรายไตรมาส"}
          aside={<span className="text-xs text-stone-500">ความก้าวหน้าสะสม</span>}
        >
          <fieldset className="grid gap-5 p-5 sm:p-6 md:grid-cols-2" disabled={!editable}>
            <label className="md:col-span-2">
              <FieldLabel required>โครงการ</FieldLabel>
              <select
                className={fieldClass}
                name="projectId"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={Boolean(record)}
                required
                aria-invalid={Boolean(state.errors?.projectId?.length)}
                aria-describedby={
                  state.errors?.projectId?.length ? "report-project-error" : undefined
                }
              >
                {options.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              {record ? <input type="hidden" name="projectId" value={projectId} /> : null}
              <FieldError id="report-project-error" errors={state.errors?.projectId} />
            </label>
            <label>
              <FieldLabel required>ไตรมาส</FieldLabel>
              <select
                className={fieldClass}
                name="quarter"
                defaultValue={record?.quarter ?? 1}
                disabled={Boolean(record)}
              >
                <option value="1">ไตรมาส 1</option>
                <option value="2">ไตรมาส 2</option>
                <option value="3">ไตรมาส 3</option>
                <option value="4">ไตรมาส 4</option>
              </select>
              {record ? <input type="hidden" name="quarter" value={record.quarter} /> : null}
            </label>
            <label>
              <FieldLabel required>กำหนดส่ง</FieldLabel>
              <input
                className={fieldClass}
                name="dueAt"
                type="date"
                defaultValue={record?.dueAt ?? today}
                required
                aria-invalid={Boolean(state.errors?.dueAt?.length)}
                aria-describedby={state.errors?.dueAt?.length ? "report-due-error" : undefined}
              />
              <FieldError id="report-due-error" errors={state.errors?.dueAt} />
            </label>
            <label className="md:col-span-2">
              <FieldLabel required>ความก้าวหน้าสะสม (%)</FieldLabel>
              <div className="mt-2 grid grid-cols-[1fr_90px] items-center gap-4">
                <input
                  className="accent-[#d8470c]"
                  name="progressRange"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(event) => setProgress(event.target.value)}
                  aria-label="ความก้าวหน้าสะสม"
                />
                <input
                  className={`${fieldClass} mt-0 text-right tabular-nums`}
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(event) => setProgress(event.target.value)}
                />
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={Number(progress)}
                  tone={Number(progress) >= 75 ? "green" : Number(progress) < 40 ? "red" : "orange"}
                />
              </div>
            </label>
            <label className="md:col-span-2">
              <FieldLabel required>สรุปผลสำเร็จและผลผลิตที่เกิดขึ้น</FieldLabel>
              <textarea
                className={areaClass}
                name="summary"
                defaultValue={record?.summary}
                maxLength={5000}
                placeholder="ระบุผลที่เกิดขึ้นจริง เทียบกับแผน และตัวเลขสำคัญ"
                aria-invalid={Boolean(state.errors?.summary?.length)}
                aria-describedby={
                  state.errors?.summary?.length ? "report-summary-error" : undefined
                }
              />
              <FieldError id="report-summary-error" errors={state.errors?.summary} />
            </label>
            <label className="md:col-span-2">
              <FieldLabel>ปัญหา อุปสรรค และแนวทางแก้ไข</FieldLabel>
              <textarea
                className={areaClass}
                name="problems"
                defaultValue={record?.problems}
                maxLength={5000}
                placeholder="หากไม่มี ให้เว้นว่างได้"
              />
            </label>
          </fieldset>
        </RegisterSection>
        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3">
            <h2 className="text-sm font-bold">สรุปรอบรายงาน</h2>
          </header>
          <dl className="divide-y divide-stone-200 text-xs">
            <div className="flex gap-3 p-4">
              <Gauge className="text-[#c9440b]" size={18} />
              <span>
                <dt className="text-stone-500">ความก้าวหน้า</dt>
                <dd className="mt-1 font-bold">{progress}% สะสม</dd>
              </span>
            </div>
            <div className="flex gap-3 p-4">
              <CalendarClock className="text-sky-700" size={18} />
              <span>
                <dt className="text-stone-500">ปีงบประมาณ</dt>
                <dd className="mt-1 font-bold">
                  {options.fiscalYears.find((item) => item.id === fiscalYearId)?.label ?? "—"}
                </dd>
              </span>
            </div>
            <div className="flex gap-3 p-4">
              <FileCheck2 className="text-emerald-700" size={18} />
              <span>
                <dt className="text-stone-500">หลักฐาน</dt>
                <dd className="mt-1 font-bold">แนบได้จากทะเบียนหลักฐาน</dd>
              </span>
            </div>
          </dl>
          <p className="flex gap-2 border-t border-stone-200 p-4 text-xs leading-5 text-stone-600">
            <AlertTriangle className="mt-0.5 shrink-0 text-orange-600" size={16} />
            ส่งตรวจเมื่อสรุปผลครบแล้ว หากถูกส่งกลับ ระบบจะเปิดให้แก้ไขเวอร์ชันถัดไป
          </p>
        </aside>
      </div>
      {editable ? (
        <FormActions pending={pending} backHref="/reports/quarterly" submitLabel="ส่งรายงานตรวจ" />
      ) : null}
    </form>
  );
}
