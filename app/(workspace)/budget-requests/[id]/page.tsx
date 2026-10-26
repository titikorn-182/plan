import Link from "next/link";
import { BudgetRequestDetailView } from "@/features/budget-requests/components/budget-request-detail";
import { getBudgetRequestDetail } from "@/features/budget-requests/detail-query";
import { getBudgetDecisionTask } from "@/features/approvals/budget-decision-query";
import { BudgetDecisionForm } from "@/features/approvals/components/budget-decision-form";

export default async function BudgetRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getBudgetRequestDetail(id);
  if (result.error || !result.data) {
    return (
      <section className="border border-stone-200 bg-white p-5 sm:p-8" role="alert">
        <h2 className="text-lg font-bold">ไม่สามารถเปิดรายละเอียดคำของบประมาณได้</h2>
        <p className="mt-3 max-w-prose text-base leading-7 text-stone-700">
          {result.error ?? "ไม่พบคำขอ หรือคุณไม่มีสิทธิ์เข้าถึงรายการนี้"}
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          กลับไปตรวจรายการใน Workflow หากยังเปิดไม่ได้ กรุณาติดต่อผู้ดูแลระบบพร้อมรหัสคำขอ
        </p>
        <Link
          className="mt-5 inline-block text-sm font-semibold text-sky-800 underline underline-offset-4"
          href="/approvals"
        >
          กลับไป Workflow อนุมัติ
        </Link>
      </section>
    );
  }
  const record = result.data;
  const decision = ["submitted", "under_review", "pending_approval"].includes(record.status)
    ? await getBudgetDecisionTask(record.id, record.organizationId)
    : { data: null, error: null };
  return (
    <div className="space-y-5">
      <BudgetRequestDetailView record={record} showDecision={decision.data?.canAct} />
      {decision.error && (
        <p role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {decision.error}
        </p>
      )}
      {decision.data && (
        <BudgetDecisionForm
          key={`${decision.data.id}:${record.version}`}
          task={decision.data}
          version={record.version}
          requestedAmount={record.amount}
        />
      )}
    </div>
  );
}
