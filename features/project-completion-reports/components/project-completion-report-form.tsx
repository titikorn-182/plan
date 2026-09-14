"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, CalendarClock, FileCheck2, ShieldCheck } from "lucide-react";
import { saveProjectCompletionReportAction } from "@/features/project-completion-reports/actions";
import { daysUntil } from "@/features/project-completion-reports/deadline";
import type { ProjectCompletionReportFormOptions } from "@/features/project-completion-reports/types";
import type { OperationState } from "@/features/shared/action-state";
import {
  areaClass,
  FieldError,
  FieldLabel,
  FormActions,
  FormNotice,
  FormTopbar,
  fieldClass,
} from "@/components/ui/operation-form";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";

function thaiDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function DeadlineStatus({ dueAt }: { dueAt: string }) {
  const remaining = daysUntil(dueAt);
  if (remaining < 0) {
    return <StatusPill tone="red">เกินกำหนด {Math.abs(remaining)} วัน</StatusPill>;
  }
  if (remaining === 0) return <StatusPill tone="red">ครบกำหนดวันนี้</StatusPill>;
  return <StatusPill tone={remaining <= 5 ? "orange" : "green"}>เหลือ {remaining} วัน</StatusPill>;
}

function ReportTextarea({
  defaultValue,
  errorId,
  errors,
  label,
  name,
  placeholder,
  required = false,
}: {
  defaultValue?: string;
  errorId: string;
  errors?: string[];
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        aria-describedby={errors?.length ? errorId : undefined}
        aria-invalid={Boolean(errors?.length)}
        className={areaClass}
        defaultValue={defaultValue}
        maxLength={5000}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      <FieldError errors={errors} id={errorId} />
    </label>
  );
}

export function ProjectCompletionReportForm({
  options,
}: {
  options: ProjectCompletionReportFormOptions;
}) {
  const record = options.record;
  const initial: OperationState = {
    id: record?.id,
    version: record?.version,
    status: record?.status,
  };
  const [state, action, pending] = useActionState(saveProjectCompletionReportAction, initial);
  const [projectId, setProjectId] = useState(record?.projectId ?? options.projects[0]?.id ?? "");
  const selectedProject = useMemo(
    () => options.projects.find((project) => project.id === projectId),
    [options.projects, projectId],
  );
  const dueAt = record?.dueAt ?? selectedProject?.dueAt ?? "";
  const endsOn = record?.endsOn ?? selectedProject?.endsOn ?? "";
  const currentStatus = state.status ?? record?.status ?? "draft";
  const editable = ["draft", "revision_required"].includes(currentStatus);
  const saved = Boolean(state.id ?? record?.id);

  if (!record && options.projects.length === 0) {
    return (
      <div className="space-y-5">
        <FormTopbar backHref="/reports/project-results" backLabel="กลับทะเบียนรายงาน" state={{}} />
        <RegisterSection title="ยังไม่มีโครงการที่เปิดให้จัดทำรายงานผล">
          <div className="p-8 text-center">
            <CalendarCheck2 className="mx-auto text-stone-400" size={34} />
            <p className="mt-3 text-sm font-semibold">
              โครงการที่มีวันสิ้นสุดและยังไม่มีรายงานจะแสดงที่นี่
            </p>
            <Link
              className="mt-4 inline-flex min-h-10 items-center bg-[#cf430c] px-4 text-sm font-semibold text-white"
              href="/projects"
            >
              เปิดทะเบียนโครงการ
            </Link>
          </div>
        </RegisterSection>
      </div>
    );
  }

  return (
    <form action={action} className="budget-request-form pb-24">
      <input name="id" type="hidden" value={state.id ?? record?.id ?? ""} />
      <input name="version" type="hidden" value={state.version ?? record?.version ?? 1} />
      <FormTopbar backHref="/reports/project-results" backLabel="กลับทะเบียนรายงาน" state={state} />
      <FormNotice
        state={state}
        idle={
          editable
            ? "บันทึกฉบับร่างได้ตลอดเวลา เมื่อส่งแล้วระบบจะล็อกรายงานและส่งเข้ากระบวนการรับรอง"
            : "รายงานนี้ถูกส่งตรวจหรือรับรองแล้ว จึงเปิดแบบอ่านอย่างเดียว"
        }
      />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <RegisterSection title="รายงานผลการดำเนินงานโครงการ">
            <fieldset className="space-y-6 p-5 sm:p-6" disabled={!editable}>
              <label className="block">
                <FieldLabel required>โครงการ</FieldLabel>
                <select
                  aria-describedby={
                    state.errors?.projectId?.length ? "completion-project-error" : undefined
                  }
                  aria-invalid={Boolean(state.errors?.projectId?.length)}
                  className={fieldClass}
                  disabled={saved}
                  name="projectId"
                  onChange={(event) => setProjectId(event.target.value)}
                  required
                  value={projectId}
                >
                  {options.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
                {saved ? <input name="projectId" type="hidden" value={projectId} /> : null}
                <FieldError errors={state.errors?.projectId} id="completion-project-error" />
              </label>

              <div className="grid gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2">
                <div className="bg-stone-50 p-4">
                  <span className="text-xs text-stone-500">วันสิ้นสุดโครงการ</span>
                  <b className="mt-1 block text-sm tabular-nums">{thaiDate(endsOn)}</b>
                </div>
                <div className="bg-[#fff4eb] p-4">
                  <span className="text-xs text-[#a83a0b]">กำหนดส่งภายใน 15 วัน</span>
                  <b className="mt-1 block text-sm tabular-nums">{thaiDate(dueAt)}</b>
                </div>
              </div>

              <ReportTextarea
                defaultValue={record?.actualResults}
                errorId="completion-results-error"
                errors={state.errors?.actualResults}
                label="สรุปผลการดำเนินงานและผลผลิตที่เกิดขึ้น"
                name="actualResults"
                placeholder="อธิบายกิจกรรมที่ดำเนินการ ผลที่เกิดขึ้นจริง และเปรียบเทียบกับแผน"
                required
              />
              <ReportTextarea
                defaultValue={record?.objectiveAchievement}
                errorId="completion-objectives-error"
                errors={state.errors?.objectiveAchievement}
                label="ผลการบรรลุวัตถุประสงค์"
                name="objectiveAchievement"
                placeholder="ระบุวัตถุประสงค์ที่บรรลุ ระดับความสำเร็จ และเหตุผลประกอบ"
                required
              />
              <ReportTextarea
                defaultValue={record?.indicatorResults}
                errorId="completion-indicators-error"
                errors={state.errors?.indicatorResults}
                label="ผลตัวชี้วัดเทียบกับค่าเป้าหมาย"
                name="indicatorResults"
                placeholder="ระบุค่าเป้าหมาย ผลจริง หน่วยนับ และแหล่งข้อมูล"
                required
              />
              <ReportTextarea
                defaultValue={record?.beneficiarySummary}
                errorId="completion-beneficiaries-error"
                errors={state.errors?.beneficiarySummary}
                label="ผู้เข้าร่วมและผู้รับประโยชน์"
                name="beneficiarySummary"
                placeholder="สรุปจำนวนและลักษณะกลุ่มเป้าหมาย พร้อมผลที่ได้รับ"
                required
              />
              <ReportTextarea
                defaultValue={record?.expenseSummary}
                errorId="completion-expenses-error"
                errors={state.errors?.expenseSummary}
                label="สรุปการใช้จ่ายงบประมาณ"
                name="expenseSummary"
                placeholder="ระบุงบอนุมัติ ยอดเบิกจ่าย คงเหลือ และเหตุผลของส่วนต่าง"
                required
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <ReportTextarea
                  defaultValue={record?.problems}
                  errorId="completion-problems-error"
                  label="ปัญหา อุปสรรค และแนวทางแก้ไข"
                  name="problems"
                  placeholder="หากไม่มี สามารถเว้นว่างได้"
                />
                <ReportTextarea
                  defaultValue={record?.lessonsLearned}
                  errorId="completion-lessons-error"
                  label="บทเรียนที่ได้รับ"
                  name="lessonsLearned"
                  placeholder="สิ่งที่ควรรักษา ปรับปรุง หรือหลีกเลี่ยงในครั้งต่อไป"
                />
              </div>
              <ReportTextarea
                defaultValue={record?.followUpPlan}
                errorId="completion-follow-up-error"
                label="ข้อเสนอแนะและแผนต่อยอด"
                name="followUpPlan"
                placeholder="ระบุการติดตามผล การขยายผล หรือการดำเนินงานต่อเนื่อง"
              />
            </fieldset>
          </RegisterSection>
        </div>

        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3">
            <h2 className="text-sm font-bold">กรอบเวลาปิดโครงการ</h2>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              ระบบคำนวณจากวันสิ้นสุดโดยอัตโนมัติ
            </p>
          </header>
          <dl className="divide-y divide-stone-200 text-xs">
            <div className="flex gap-3 p-4">
              <CalendarClock className="shrink-0 text-[#c9440b]" size={18} />
              <span>
                <dt className="text-stone-500">กำหนดส่งรายงาน</dt>
                <dd className="mt-1 font-bold tabular-nums">{thaiDate(dueAt)}</dd>
                {dueAt ? (
                  <span className="mt-2 block">
                    <DeadlineStatus dueAt={dueAt} />
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex gap-3 p-4">
              <ShieldCheck className="shrink-0 text-emerald-700" size={18} />
              <span>
                <dt className="text-stone-500">ขั้นตอนรับรอง</dt>
                <dd className="mt-1 font-bold">ผู้ตรวจระดับหน่วยงาน → ผู้บริหาร</dd>
              </span>
            </div>
            <div className="flex gap-3 p-4">
              <FileCheck2 className="shrink-0 text-sky-800" size={18} />
              <span>
                <dt className="text-stone-500">หลักฐานประกอบ</dt>
                <dd className="mt-1 font-bold">แนบไฟล์หลังบันทึกฉบับร่าง</dd>
              </span>
            </div>
          </dl>
          {(state.id ?? record?.id) ? (
            <Link
              className="flex min-h-11 items-center justify-center border-t border-stone-200 px-4 text-xs font-bold text-sky-800 hover:bg-sky-50"
              href={`/evidence?entityType=project_completion_report&entityId=${state.id ?? record?.id}`}
            >
              เปิดทะเบียนหลักฐานเพื่อแนบไฟล์
            </Link>
          ) : (
            <p className="border-t border-stone-200 p-4 text-xs leading-5 text-stone-600">
              บันทึกฉบับร่างก่อน ระบบจึงจะสร้างเลขอ้างอิงสำหรับแนบหลักฐาน
            </p>
          )}
        </aside>
      </div>
      {editable ? (
        <FormActions
          backHref="/reports/project-results"
          pending={pending}
          submitLabel="ส่งรายงานตรวจ"
        />
      ) : null}
    </form>
  );
}
