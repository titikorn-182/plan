"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { actOnApprovalAction } from "@/features/approvals/actions";
import type { BudgetDecisionTask } from "@/features/approvals/budget-decision-query";
import type { OperationState } from "@/features/shared/action-state";
import { INPUT_LIMITS } from "@/lib/config/limits";

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BudgetDecisionForm({
  task,
  version,
  requestedAmount,
}: {
  task: BudgetDecisionTask;
  version: number;
  requestedAmount: number;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(actOnApprovalAction, {} satisfies OperationState);
  const [amount, setAmount] = useState(requestedAmount.toFixed(2));
  const [comment, setComment] = useState("");
  const finalApproval = task.requiredRole === "executive";
  const validAmount = /^\d+(?:\.\d{1,2})?$/.test(amount.trim());
  const difference = validAmount ? Number(amount) - requestedAmount : null;
  const amountError = state.errors?.approvedAmount?.[0];
  const commentError = state.errors?.comment?.[0];

  if (!task.canAct)
    return (
      <p className="border border-stone-200 bg-white p-5 text-sm text-stone-600">
        คำขออยู่ระหว่างพิจารณาโดยผู้รับมอบหมาย
      </p>
    );

  return (
    <section
      className="border border-stone-200 bg-white p-5 sm:p-6"
      aria-labelledby="budget-decision-title"
    >
      <h2 id="budget-decision-title" className="text-lg font-bold">
        {finalApproval ? "พิจารณาอนุมัติวงเงิน" : "ตรวจสอบคำของบประมาณ"}
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-stone-600">
        {finalApproval
          ? "ตรวจรายละเอียดและค่าใช้จ่ายด้านบนก่อนอนุมัติ หากเพิ่มหรือลดวงเงิน โปรดระบุเหตุผลประกอบ"
          : "ตรวจความครบถ้วนของคำขอ แล้วส่งต่อให้ผู้บริหารพิจารณาวงเงิน"}
      </p>
      <form action={action} noValidate className="mt-5 space-y-5" aria-label="พิจารณาคำของบประมาณ">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="expectedBudgetVersion" value={version} />
        <fieldset
          disabled={pending || state.success === true}
          className="space-y-5 disabled:opacity-70"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-600">วงเงินที่ขอ (บาท)</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {currency.format(requestedAmount)}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                เก็บยอดและรายละเอียดคำขอต้นฉบับไว้เป็นหลักฐาน
              </p>
            </div>
            {finalApproval && (
              <div>
                <label htmlFor="approved-amount" className="block text-sm font-semibold">
                  วงเงินที่พิจารณาอนุมัติ (บาท)
                </label>
                <input
                  id="approved-amount"
                  name="approvedAmount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby="approved-amount-help approved-amount-error"
                  className="mt-2 min-h-11 w-full border border-stone-300 px-3 py-2 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-orange-600"
                />
                <p
                  id="approved-amount-help"
                  className="mt-2 text-sm text-stone-600"
                  aria-live="polite"
                >
                  {difference === null
                    ? "ระบุจำนวนตั้งแต่ 0 บาท ทศนิยมไม่เกิน 2 ตำแหน่ง"
                    : difference === 0
                      ? "เท่ากับวงเงินที่ขอ"
                      : `${difference > 0 ? "เพิ่ม" : "ลด"}จากวงเงินที่ขอ ${currency.format(Math.abs(difference))} บาท`}
                </p>
                <p id="approved-amount-error" className="mt-1 text-sm text-red-700">
                  {amountError}
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="approval-comment" className="block text-sm font-semibold">
              เหตุผล / ความเห็นประกอบ
            </label>
            <textarea
              id="approval-comment"
              name="comment"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={INPUT_LIMITS.reviewComment}
              aria-invalid={Boolean(commentError)}
              aria-describedby="approval-comment-help approval-comment-error"
              className="mt-2 w-full border border-stone-300 px-3 py-2 text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-orange-600"
            />
            <p id="approval-comment-help" className="mt-2 text-sm text-stone-600">
              อย่างน้อย 5 ตัวอักษรเมื่อปรับวงเงิน ส่งกลับ หรือไม่อนุมัติ
            </p>
            <p id="approval-comment-error" className="mt-1 text-sm text-red-700">
              {commentError}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-5">
            <button
              name="decision"
              value="revision_required"
              className="min-h-11 border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              ส่งกลับแก้ไข
            </button>
            <button
              name="decision"
              value="rejected"
              className="min-h-11 border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              ไม่อนุมัติ
            </button>
            <button
              name="decision"
              value="approved"
              className="min-h-11 bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              {pending
                ? "กำลังบันทึก…"
                : finalApproval
                  ? "อนุมัติวงเงิน"
                  : "ผ่านการตรวจสอบและส่งต่อ"}
            </button>
          </div>
        </fieldset>
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${state.success ? "text-emerald-700" : "text-red-700"}`}
        >
          {state.message}
        </p>
        {state.success === false && (
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-block min-h-11 py-2 text-sm font-semibold text-sky-800 underline underline-offset-4"
          >
            เปิดข้อมูลล่าสุดเพื่อตรวจสอบอีกครั้ง
          </button>
        )}
      </form>
    </section>
  );
}
