"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarRange, CircleDollarSign, ClipboardCheck, UserRound } from "lucide-react";
import { saveProjectAction, type OperationState } from "@/app/operations/actions";
import { FormActions, FieldError, FieldLabel, FormNotice, FormTopbar, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import type { ProjectFormOptions } from "@/lib/domain";

export function ProjectForm({ options }: { options: ProjectFormOptions }) {
  const record = options.record;
  const initial: OperationState = { id: record?.id, version: record?.version };
  const [state, action, pending] = useActionState(saveProjectAction, initial);
  const [organizationId, setOrganizationId] = useState(record?.organizationId ?? options.organizations[0]?.id ?? "");
  const [fiscalYearId, setFiscalYearId] = useState(record?.fiscalYearId ?? options.fiscalYears[0]?.id ?? "");
  const [budget, setBudget] = useState(String(record?.approvedBudget ?? 0));
  const [target, setTarget] = useState(String(record?.disbursementTarget ?? 25));
  const [ownerName, setOwnerName] = useState(record?.ownerName ?? options.defaultOwnerName);
  const [coordinatorName, setCoordinatorName] = useState(record?.coordinatorName ?? options.defaultOwnerName);
  const [startsOn, setStartsOn] = useState(record?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(record?.endsOn ?? "");
  const editable = !record || (record.status === "proposed" && !record.pendingApproval);
  const readiness = useMemo(() => {
    let count = 0;
    if (ownerName.trim() && coordinatorName.trim()) count++;
    if (Number(budget) > 0 && Number(target) >= 0 && Number(target) <= 100) count++;
    if (startsOn && endsOn && endsOn >= startsOn) count++;
    return count;
  }, [budget, coordinatorName, endsOn, ownerName, startsOn, target]);
  return (
    <form action={action} className="budget-request-form pb-24">
      <input type="hidden" name="id" value={state.id ?? record?.id ?? ""} />
      <input type="hidden" name="version" value={state.version ?? record?.version ?? 1} />
      <FormTopbar backHref="/projects" backLabel="กลับทะเบียนโครงการ" state={state} />
      <FormNotice state={state} idle={editable ? "บันทึกเป็นฉบับร่างได้ตลอดเวลา และส่งเข้าสู่ workflow เมื่อข้อมูลพร้อม" : "ข้อเสนอนี้อยู่ระหว่างอนุมัติหรือเริ่มดำเนินงานแล้ว จึงเปิดแบบอ่านอย่างเดียว"} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <RegisterSection title={record ? `แก้ไขข้อเสนอโครงการ ${record.code}` : "สร้างข้อเสนอโครงการ"} aside={<span className="text-xs text-stone-500">เวอร์ชัน {state.version ?? record?.version ?? 1}</span>}>
          <fieldset className="grid gap-5 p-5 sm:p-6 md:grid-cols-2" disabled={!editable}>
            <label className="md:col-span-2"><FieldLabel required>ชื่อโครงการ</FieldLabel><input className={fieldClass} name="title" defaultValue={record?.title} maxLength={300} required aria-invalid={Boolean(state.errors?.title?.length)} aria-describedby={state.errors?.title?.length ? "project-title-error" : undefined} /><FieldError id="project-title-error" errors={state.errors?.title} /></label>
            <label><FieldLabel required>หน่วยงานเจ้าของโครงการ</FieldLabel><select className={fieldClass} name="organizationId" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required aria-invalid={Boolean(state.errors?.organizationId?.length)} aria-describedby={state.errors?.organizationId?.length ? "project-organization-error" : undefined}>{options.organizations.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.label}</option>)}</select><FieldError id="project-organization-error" errors={state.errors?.organizationId} /></label>
            <label><FieldLabel required>ปีงบประมาณ</FieldLabel><select className={fieldClass} name="fiscalYearId" value={fiscalYearId} onChange={(event) => setFiscalYearId(event.target.value)} required>{options.fiscalYears.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label><FieldLabel>อ้างอิงคำของบที่อนุมัติ</FieldLabel><select className={fieldClass} name="budgetRequestId" defaultValue={record?.budgetRequestId ?? ""}><option value="">ไม่ผูกคำของบ</option>{options.budgetRequests.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label><FieldLabel required>ประเภทโครงการ</FieldLabel><select className={fieldClass} name="projectType" defaultValue={record?.projectType ?? "พัฒนาการเรียนการสอน"} aria-invalid={Boolean(state.errors?.projectType?.length)} aria-describedby={state.errors?.projectType?.length ? "project-type-error" : undefined}><option>พัฒนาการเรียนการสอน</option><option>วิจัยและนวัตกรรม</option><option>บริการวิชาการ</option><option>พัฒนาระบบบริหาร</option><option>โครงสร้างพื้นฐานดิจิทัล</option><option>สิ่งก่อสร้าง</option></select><FieldError id="project-type-error" errors={state.errors?.projectType} /></label>
            <label><FieldLabel required>เจ้าของโครงการ</FieldLabel><input className={fieldClass} name="ownerName" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} maxLength={180} required aria-invalid={Boolean(state.errors?.ownerName?.length)} aria-describedby={state.errors?.ownerName?.length ? "project-owner-error" : undefined} /><FieldError id="project-owner-error" errors={state.errors?.ownerName} /></label>
            <label><FieldLabel required>ผู้ประสานงาน</FieldLabel><input className={fieldClass} name="coordinatorName" value={coordinatorName} onChange={(event) => setCoordinatorName(event.target.value)} maxLength={180} required aria-invalid={Boolean(state.errors?.coordinatorName?.length)} aria-describedby={state.errors?.coordinatorName?.length ? "project-coordinator-error" : undefined} /><FieldError id="project-coordinator-error" errors={state.errors?.coordinatorName} /></label>
            <label><FieldLabel required>วงเงินอนุมัติ (บาท)</FieldLabel><input className={`${fieldClass} text-right tabular-nums`} name="approvedBudget" type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} required aria-invalid={Boolean(state.errors?.approvedBudget?.length)} aria-describedby={state.errors?.approvedBudget?.length ? "project-budget-error" : undefined} /><FieldError id="project-budget-error" errors={state.errors?.approvedBudget} /></label>
            <label><FieldLabel required>เป้าหมายเบิกจ่าย (%)</FieldLabel><input className={`${fieldClass} text-right tabular-nums`} name="disbursementTarget" type="number" min="0" max="100" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} required /></label>
            <label><FieldLabel required>วันเริ่มต้น</FieldLabel><input className={fieldClass} name="startsOn" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required /></label>
            <label><FieldLabel required>วันสิ้นสุด</FieldLabel><input className={fieldClass} name="endsOn" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required aria-invalid={Boolean(state.errors?.endsOn?.length)} aria-describedby={state.errors?.endsOn?.length ? "project-ends-error" : undefined} /><FieldError id="project-ends-error" errors={state.errors?.endsOn} /></label>
          </fieldset>
        </RegisterSection>
        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3"><h2 className="text-sm font-bold">จุดตรวจความพร้อม</h2></header>
          <div className="space-y-4 p-4 text-xs"><div className="flex items-center gap-3"><ClipboardCheck className="text-[#c9440b]" size={19} /><b>ข้อมูลหลัก {readiness}/3 จุด</b></div><div className="h-1.5 bg-stone-200"><div className="h-full bg-[#df4a0c]" style={{ width: `${readiness * (100 / 3)}%` }} /></div><ul className="space-y-3 text-stone-600"><li className="flex gap-2"><UserRound size={16} /> เจ้าของและผู้ประสานงาน</li><li className="flex gap-2"><CircleDollarSign size={16} /> วงเงินและเป้าหมายเบิกจ่าย</li><li className="flex gap-2"><CalendarRange size={16} /> ช่วงเวลาดำเนินงาน</li></ul><p className="border-t border-stone-200 pt-4 leading-5">เมื่อส่ง ระบบจะสร้างงานตรวจสอบตามบทบาทและหน่วยงานโดยอัตโนมัติ</p></div>
        </aside>
      </div>
      {editable ? <FormActions pending={pending} backHref="/projects" /> : null}
    </form>
  );
}
