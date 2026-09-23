import Link from "next/link";
import { BudgetRequestDetailView } from "@/features/budget-requests/components/budget-request-detail";
import { getBudgetRequestDetail } from "@/features/budget-requests/detail-query";

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
  return <BudgetRequestDetailView record={result.data} />;
}
