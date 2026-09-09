import { AlertCircle, Check, ShieldCheck } from "lucide-react";
import type { BudgetProposalDetails } from "@/features/budget-requests/proposal-details";

interface BudgetRequestReadinessProps {
  amount: string;
  details: BudgetProposalDetails;
  fiscalYearId: string;
  onNavigate: (step: number) => void;
  organizationId: string;
  ownerName: string;
  projectType: string;
  rationale: string;
  title: string;
}

export function BudgetRequestReadiness({
  amount,
  details,
  fiscalYearId,
  onNavigate,
  organizationId,
  ownerName,
  projectType,
  rationale,
  title,
}: BudgetRequestReadinessProps) {
  const checks = [
    {
      complete: Boolean(
        title.trim().length >= 5 &&
        organizationId &&
        fiscalYearId &&
        projectType.trim() &&
        ownerName.trim().length >= 2 &&
        rationale.trim(),
      ),
      label: "ข้อมูลทั่วไปครบถ้วน",
      step: 0,
    },
    {
      complete: Boolean(details.missionName && details.operationalPlanName),
      label: "ระบุพันธกิจและแผนงาน",
      step: 1,
    },
    {
      complete: Number(amount) > 0,
      label: "แจกแจงวงเงินคำขอ",
      step: 2,
    },
    {
      complete: Boolean(
        details.startsOn && details.endsOn && details.objectives && details.expectedBenefits,
      ),
      label: "ระบุผลลัพธ์และช่วงเวลา",
      step: 3,
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const percentage = Math.round((completed / checks.length) * 100);

  return (
    <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
      <header className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-bold">ความพร้อมก่อนส่ง</h2>
      </header>
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-emerald-600" size={19} />
          <span>
            <b className="block text-xs">ข้อมูลสำคัญ</b>
            <small className="text-[11px] text-stone-500">
              พร้อมแล้ว {completed} จาก {checks.length} ส่วน
            </small>
          </span>
        </div>
        <div
          className="h-1.5 bg-stone-200"
          role="progressbar"
          aria-label="ความพร้อมของคำของบประมาณ"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <div
            className="h-full bg-emerald-600 transition-[width]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <ul className="space-y-1.5">
          {checks.map((check) => (
            <li key={check.label}>
              <button
                className={`flex w-full items-start gap-2 px-1 py-1.5 text-left text-xs transition-colors hover:bg-stone-50 ${check.complete ? "text-stone-600" : "text-orange-700"}`}
                type="button"
                onClick={() => onNavigate(check.step)}
              >
                {check.complete ? (
                  <Check size={15} className="shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
                )}
                <span>{check.label}</span>
                <span className="sr-only">{check.complete ? "เสร็จแล้ว" : "ยังไม่ครบ"}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-stone-200 pt-3 text-[11px] leading-5 text-stone-500">
          รายการนี้เป็นคำแนะนำเพื่อช่วยตรวจทาน สามารถบันทึกฉบับร่างไว้กรอกต่อภายหลังได้
        </p>
      </div>
    </aside>
  );
}
