import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import type { BudgetRequestDetail } from "@/features/budget-requests/detail-types";
import { BUDGET_STATUS_LABELS } from "@/features/budget-requests/types";
import {
  BUDGET_REQUEST_SOURCE_SECTIONS,
  type BudgetRequestSourceKey,
} from "@/features/budget-requests/source-fields";
import { BudgetRequestDetailExpenses } from "@/features/budget-requests/components/budget-request-detail-expenses";

const thaiDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  dateStyle: "long",
  timeZone: "Asia/Bangkok",
});

function fieldValue(record: BudgetRequestDetail, key: BudgetRequestSourceKey): string {
  switch (key) {
    case "projectActivityName":
      return record.title;
    case "ownerName":
      return record.ownerName;
    case "projectType":
      return record.projectType;
    case "rationale":
      return record.rationale;
    case "totalBudget":
      return String(record.amount);
    case "startsOn":
    case "endsOn": {
      const value = record.proposalDetails[key];
      return value ? thaiDate.format(new Date(`${value}T00:00:00+07:00`)) : "";
    }
    default:
      return record.proposalDetails[key];
  }
}

export function BudgetRequestDetailView({ record }: { record: BudgetRequestDetail }) {
  const details = record.proposalDetails;
  const statusTone =
    record.status === "approved"
      ? "green"
      : ["rejected", "revision_required"].includes(record.status)
        ? "red"
        : ["submitted", "under_review", "pending_approval"].includes(record.status)
          ? "orange"
          : "gray";
  return (
    <section className="min-w-0 space-y-5" aria-label="รายละเอียดคำของบประมาณ">
      <nav
        className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-sky-800"
        aria-label="กลับไปยังรายการ"
      >
        <Link
          className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
          href="/approvals"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          กลับไป Workflow อนุมัติ
        </Link>
        <Link
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          href="/budget-requests"
        >
          ทะเบียนคำของบประมาณ
        </Link>
      </nav>
      <section className="border border-stone-200 bg-white p-5 sm:p-6" aria-label="ข้อมูลคำขอ">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold [overflow-wrap:anywhere]">คำขอ {record.code}</h2>
          <StatusPill tone={statusTone}>
            {record.status === "rejected" ? "ไม่อนุมัติ" : BUDGET_STATUS_LABELS[record.status]}
          </StatusPill>
        </div>
        <p className="mt-3 max-w-prose text-xl font-bold leading-relaxed [overflow-wrap:anywhere]">
          {record.title}
        </p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["ปีงบประมาณ", record.fiscalYearLabel],
            ["หน่วยงานเจ้าของคำขอ", record.organizationName],
            ["วันที่ส่งคำขอ", record.submittedAt],
            ["แก้ไขล่าสุด", record.updatedAt],
          ].map(([label, value]) => (
            <div className="min-w-0" key={label}>
              <dt className="text-stone-600">{label}</dt>
              <dd className="mt-1 font-semibold [overflow-wrap:anywhere]">
                {value || "ไม่ได้ระบุ"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 border-t border-stone-200 pt-4 text-sm leading-6 text-stone-600">
          แสดงข้อมูลที่บันทึกไว้แบบอ่านอย่างเดียว การเปิดหน้านี้ไม่เปลี่ยนข้อมูลหรือสถานะคำขอ
          กรุณากลับไป Workflow เพื่อพิจารณาอนุมัติ
        </p>
      </section>
      {BUDGET_REQUEST_SOURCE_SECTIONS.map((section) => (
        <RegisterSection title={section.title} key={section.id}>
          <div className="min-w-0 p-5 text-base leading-7 sm:p-6">
            {section.fields.length > 0 ? (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    className={`min-w-0 ${field.control === "textarea" ? "sm:col-span-2" : ""}`}
                    key={field.key}
                  >
                    <dt className="text-sm font-semibold text-stone-600">
                      {field.label ?? field.header}
                    </dt>
                    <dd className="mt-1 max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                      {fieldValue(record, field.key) || "ไม่ได้ระบุ"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.id === "budget" ? <BudgetRequestDetailExpenses record={record} /> : null}
            {section.id === "sdgs" ? (
              <div className="space-y-4">
                {details.sdgs.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-6">
                    {details.sdgs.map((sdg) => (
                      <li className="[overflow-wrap:anywhere]" key={sdg}>
                        {sdg}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-stone-600">ไม่ได้ระบุเป้าหมาย SDG</p>
                )}
                <dl>
                  <dt className="text-sm font-semibold text-stone-600">คำอธิบายความสอดคล้อง</dt>
                  <dd className="mt-1 max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                    {details.alignmentDescription || "ไม่ได้ระบุ"}
                  </dd>
                </dl>
              </div>
            ) : null}
            {section.id === "source" ? (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["กองทุน", details.fundName],
                  ["ยุทธศาสตร์มหาวิทยาลัย", details.universityStrategy],
                  ["เป้าประสงค์", details.goalName],
                ].map(([label, value]) =>
                  value ? (
                    <div className="min-w-0" key={label}>
                      <dt className="text-sm font-semibold text-stone-600">{label}</dt>
                      <dd className="mt-1 max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  ) : null,
                )}
              </dl>
            ) : null}
            {section.id === "outcomes" && details.successIndicators ? (
              <dl className="mt-5">
                <dt className="text-sm font-semibold text-stone-600">ตัวชี้วัดความสำเร็จ</dt>
                <dd className="mt-1 max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                  {details.successIndicators}
                </dd>
              </dl>
            ) : null}
            {section.id === "approval" ? (
              <div className="mt-6 border-t border-stone-200 pt-5">
                <h3 className="font-semibold">ผู้รับผิดชอบโครงการ</h3>
                {details.projectMembers.length > 0 ? (
                  <ul className="mt-3 divide-y divide-stone-200">
                    {details.projectMembers.map((member, index) => (
                      <li className="py-3 first:pt-0 [overflow-wrap:anywhere]" key={index}>
                        <span className="font-semibold">{member.name || "ไม่ได้ระบุชื่อ"}</span>
                        <span className="mt-1 block text-sm text-stone-600">
                          {member.position || "ไม่ได้ระบุตำแหน่ง"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-stone-600">ไม่ได้ระบุผู้ร่วมรับผิดชอบเพิ่มเติม</p>
                )}
              </div>
            ) : null}
          </div>
        </RegisterSection>
      ))}
    </section>
  );
}
