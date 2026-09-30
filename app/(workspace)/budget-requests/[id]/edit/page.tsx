import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { budgetRequestEditDeniedReason } from "@/features/budget-requests/edit-policy";
import { BudgetRequestWorkbookForm } from "@/features/budget-requests/components/budget-request-workbook-form";
import { DataError } from "@/components/ui/data-state";
import { getBudgetFormOptions } from "@/features/budget-requests/queries";

export default async function EditBudgetRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, viewer] = await Promise.all([getBudgetFormOptions(id), getViewer()]);
  if (!result.error && (!result.data || !result.data.record)) notFound();

  const record = result.data?.record;
  const denied = record
    ? budgetRequestEditDeniedReason(viewer, {
        status: record.status,
        ownerId: record.ownerId ?? null,
        lockedAt: record.lockedAt ?? null,
      })
    : "ไม่พบคำขอ";
  return result.error || !result.data || denied ? (
    <DataError message={result.error ?? denied ?? "คำของบประมาณนี้ไม่อยู่ในสถานะที่แก้ไขได้"} />
  ) : (
    <BudgetRequestWorkbookForm key={id} options={result.data} />
  );
}
