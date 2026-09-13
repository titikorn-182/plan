"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarRange, CircleDollarSign, ClipboardCheck, FileText, UserRound } from "lucide-react";
import { saveProjectAction } from "@/features/projects/actions";
import type { OperationState } from "@/features/shared/action-state";
import { FormActions, FormNotice, FormTopbar } from "@/components/ui/operation-form";
import type { ProjectFormOptions } from "@/features/projects/types";
import {
  createEmptyProjectExpenseItem,
  createEmptyProjectProposalDetails,
  sumProjectExpenses,
} from "@/features/projects/proposal-details";
import {
  ProposalAlignment,
  ProposalBasics,
  ProposalBudget,
  ProposalPlan,
  ProposalResults,
} from "@/features/projects/components/project-proposal-sections";

const SECTION_LINKS = [
  ["project-basics", "ข้อมูลโครงการ"],
  ["project-alignment", "ความสอดคล้อง"],
  ["project-plan", "แผนปฏิบัติการ"],
  ["project-budget", "งบประมาณ"],
  ["project-results", "ผลลัพธ์"],
] as const;

export function ProjectForm({ options }: { options: ProjectFormOptions }) {
  const record = options.record;
  const initial: OperationState = { id: record?.id, version: record?.version };
  const [state, action, pending] = useActionState(saveProjectAction, initial);
  const [organizationId, setOrganizationId] = useState(
    record?.organizationId ?? options.organizations[0]?.id ?? "",
  );
  const [fiscalYearId, setFiscalYearId] = useState(
    record?.fiscalYearId ?? options.fiscalYears[0]?.id ?? "",
  );
  const [title, setTitle] = useState(record?.title ?? "");
  const [ownerName, setOwnerName] = useState(record?.ownerName ?? options.defaultOwnerName);
  const [target, setTarget] = useState(String(record?.disbursementTarget ?? 25));
  const [startsOn, setStartsOn] = useState(record?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(record?.endsOn ?? "");
  const [details, setDetails] = useState(() => {
    if (record) return record.proposalDetails;
    return {
      ...createEmptyProjectProposalDetails(),
      responsiblePeople: [{ name: "", position: "" }],
      goalIndicators: [
        { goal: "", longTermIndicator: "", actionIndicator: "", unit: "", target: "" },
      ],
      actionPlan: [{ description: "", months: [] }],
      expenseItems: [createEmptyProjectExpenseItem()],
    };
  });
  const editable = !record || (record.status === "proposed" && !record.pendingApproval);
  const totalBudget = sumProjectExpenses(details);
  const readiness = useMemo(
    () => [
      Boolean(
        title.trim() &&
        ownerName.trim() &&
        organizationId &&
        fiscalYearId &&
        (details.characteristics.length || details.otherCharacteristic.trim()),
      ),
      Boolean(
        details.strategies.length &&
        details.rationale.trim() &&
        details.objectives.trim() &&
        details.targetGroup.trim() &&
        details.actionPlan.some((item) => item.description.trim() && item.months.length) &&
        details.sdgs.length > 0 &&
        details.sdgAlignmentDescription.trim() &&
        details.startWeek !== null &&
        details.endWeek !== null &&
        startsOn &&
        endsOn &&
        endsOn >= startsOn,
      ),
      Boolean(
        totalBudget > 0 &&
        Number(target) >= 0 &&
        Number(target) <= 100 &&
        details.expectedResults.trim() &&
        details.processIndicator.trim() &&
        details.outputIndicator.trim(),
      ),
    ],
    [
      details,
      endsOn,
      fiscalYearId,
      organizationId,
      ownerName,
      startsOn,
      target,
      title,
      totalBudget,
    ],
  );
  const completed = readiness.filter(Boolean).length;
  const shared = { details, setDetails, errors: state.errors, disabled: !editable };
  const coordinatorName =
    details.responsiblePeople.find((person) => person.name.trim())?.name ?? ownerName;

  return (
    <form action={action} className="budget-request-form pb-24">
      <input type="hidden" name="id" value={state.id ?? record?.id ?? ""} />
      <input type="hidden" name="version" value={state.version ?? record?.version ?? 1} />
      <input type="hidden" name="coordinatorName" value={coordinatorName} />
      <input type="hidden" name="proposalDetails" value={JSON.stringify(details)} />
      <FormTopbar backHref="/projects" backLabel="กลับทะเบียนโครงการ" state={state} />
      <FormNotice
        state={state}
        idle={
          editable
            ? "บันทึกเป็นฉบับร่างได้ตลอดเวลา ระบบจะตรวจความครบถ้วนอีกครั้งเมื่อส่งอนุมัติ"
            : "ข้อเสนอนี้อยู่ระหว่างอนุมัติหรือเริ่มดำเนินงานแล้ว จึงเปิดแบบอ่านอย่างเดียว"
        }
      />

      <header className="mt-5 border border-stone-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-stone-950 sm:text-2xl">
              {record ? `แก้ไขข้อเสนอโครงการ ${record.code}` : "แบบเสนอโครงการ"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              จัดทำข้อเสนอโครงการที่ได้รับจัดสรรจากเงินรายได้ พร้อมแผนปฏิบัติการ งบประมาณ
              และตัวชี้วัดในที่เดียว
            </p>
          </div>
          <span className="border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800">
            เวอร์ชัน {state.version ?? record?.version ?? 1}
          </span>
        </div>
        <nav
          className="mt-5 flex gap-px overflow-x-auto border border-stone-200 bg-stone-200"
          aria-label="หัวข้อแบบเสนอโครงการ"
        >
          {SECTION_LINKS.map(([id, label], index) => (
            <a
              className="min-w-max flex-1 bg-white px-4 py-3 text-center text-xs font-semibold text-stone-600 hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-300"
              href={`#${id}`}
              key={id}
            >
              {index + 1}. {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="space-y-5">
          <div className="scroll-mt-28" id="project-basics">
            <ProposalBasics
              {...shared}
              options={options}
              organizationId={organizationId}
              fiscalYearId={fiscalYearId}
              title={title}
              ownerName={ownerName}
              setOrganizationId={setOrganizationId}
              setFiscalYearId={setFiscalYearId}
              setTitle={setTitle}
              setOwnerName={setOwnerName}
            />
          </div>
          <div className="scroll-mt-28" id="project-alignment">
            <ProposalAlignment {...shared} />
          </div>
          <div className="scroll-mt-28" id="project-plan">
            <ProposalPlan
              {...shared}
              startsOn={startsOn}
              endsOn={endsOn}
              setStartsOn={setStartsOn}
              setEndsOn={setEndsOn}
            />
          </div>
          <div className="scroll-mt-28" id="project-budget">
            <ProposalBudget {...shared} target={target} setTarget={setTarget} />
          </div>
          <div className="scroll-mt-28" id="project-results">
            <ProposalResults {...shared} />
          </div>
        </main>

        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 bg-[#fff4eb] px-4 py-3">
            <h2 className="text-sm font-bold">ความพร้อมก่อนส่ง</h2>
          </header>
          <div className="space-y-4 p-4 text-xs">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="text-[#c9440b]" size={19} />
              <b>ข้อมูลครบ {completed}/3 จุด</b>
            </div>
            <div className="h-1.5 bg-stone-200">
              <div
                className="h-full bg-[#df4a0c] transition-[width] duration-300"
                style={{ width: `${completed * (100 / 3)}%` }}
              />
            </div>
            <ul className="space-y-3 text-stone-700">
              <li className="flex gap-2">
                <UserRound
                  className={readiness[0] ? "text-emerald-600" : "text-stone-400"}
                  size={16}
                />{" "}
                ข้อมูลโครงการและผู้รับผิดชอบ
              </li>
              <li className="flex gap-2">
                <CalendarRange
                  className={readiness[1] ? "text-emerald-600" : "text-stone-400"}
                  size={16}
                />{" "}
                ความสอดคล้องและแผนงาน
              </li>
              <li className="flex gap-2">
                <CircleDollarSign
                  className={readiness[2] ? "text-emerald-600" : "text-stone-400"}
                  size={16}
                />{" "}
                งบประมาณ ผลลัพธ์ และตัวชี้วัด
              </li>
            </ul>
            <div className="border-t border-stone-200 pt-4">
              <p className="flex items-center gap-2 font-bold tabular-nums">
                <FileText size={16} /> วงเงินรวม{" "}
                {totalBudget.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
              </p>
              <p className="mt-2 leading-5 text-stone-600">
                เมื่อส่ง ระบบจะสร้างงานตรวจสอบตามบทบาทและหน่วยงานโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </aside>
      </div>
      {editable ? <FormActions pending={pending} backHref="/projects" /> : null}
    </form>
  );
}
