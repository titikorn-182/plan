import { ArrowLeft, ArrowRight, LoaderCircle, Save, Send } from "lucide-react";
import { BUDGET_REQUEST_STEPS } from "@/features/budget-requests/components/budget-request-stepper";

export function BudgetRequestFormActions({
  pending,
  step,
  onBack,
  onNext,
}: {
  pending: boolean;
  step: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const lastStep = BUDGET_REQUEST_STEPS.length - 1;
  return (
    <div className="form-action-bar fixed right-0 bottom-0 left-[206px] z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-stone-300 bg-white px-4 py-3 shadow-[0_-4px_14px_rgba(28,25,23,0.08)] max-[960px]:left-[72px] max-[700px]:left-0 lg:px-8">
      <button
        className="form-action-back inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        type="button"
        aria-label="ย้อนกลับหนึ่งขั้นตอน"
        disabled={step === 0}
        onClick={onBack}
      >
        <ArrowLeft size={16} /> <span>ย้อนกลับ</span>
      </button>
      <div className="form-action-group flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold hover:border-[#d8470c] disabled:cursor-wait disabled:opacity-60"
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
          บันทึกฉบับร่าง
        </button>
        {step < lastStep ? (
          <button
            className="inline-flex items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507]"
            type="button"
            onClick={onNext}
          >
            ถัดไป <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
          >
            {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
            ส่งคำขอ
          </button>
        )}
      </div>
    </div>
  );
}
