import { Check } from "lucide-react";

export const BUDGET_REQUEST_STEPS = [
  "ข้อมูลทั่วไป",
  "ความสอดคล้องยุทธศาสตร์",
  "รายละเอียดงบประมาณ",
  "ผลผลิตและตัวชี้วัด",
  "เอกสารแนบ",
] as const;

export function BudgetRequestStepper({ currentStep }: { currentStep: number }) {
  return (
    <ol
      className="mb-5 grid overflow-hidden border border-stone-200 bg-white md:grid-cols-5"
      aria-label="ขั้นตอนการสร้างคำของบ"
    >
      {BUDGET_REQUEST_STEPS.map((label, index) => (
        <li
          className={`relative flex min-h-16 items-center gap-3 border-b border-stone-200 px-4 py-3 last:border-b-0 md:border-r md:border-b-0 ${index === currentStep ? "bg-[#fff4eb]" : index < currentStep ? "bg-emerald-50/50" : ""}`}
          key={label}
        >
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${index < currentStep ? "border-emerald-600 bg-emerald-600 text-white" : index === currentStep ? "border-[#d8470c] bg-[#d8470c] text-white" : "border-stone-300 text-stone-500"}`}
          >
            {index < currentStep ? <Check size={14} /> : index + 1}
          </span>
          <span
            className={`text-xs font-semibold ${index === currentStep ? "text-[#b53807]" : "text-stone-600"}`}
          >
            {label}
          </span>
          {index === currentStep ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#d8470c]" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
