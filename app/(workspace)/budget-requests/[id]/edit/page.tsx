import { notFound } from "next/navigation";
import { BudgetRequestForm } from "@/features/budget-requests/components/budget-request-form";
import { DataError } from "@/components/ui/data-state";
import { getBudgetFormOptions } from "@/features/budget-requests/queries";

export default async function EditBudgetRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getBudgetFormOptions(id);
  if (!result.error && (!result.data || !result.data.record)) notFound();

  const editable =
    result.data?.record && ["draft", "revision_required"].includes(result.data.record.status);
  return result.error || !result.data || !editable ? (
    <DataError message={result.error ?? "คำของบประมาณนี้ไม่อยู่ในสถานะที่แก้ไขได้"} />
  ) : (
    <BudgetRequestForm options={result.data} />
  );
}
