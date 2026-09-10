import { BudgetRequestWorkbookForm } from "@/features/budget-requests/components/budget-request-workbook-form";
import { DataError } from "@/components/ui/data-state";
import { getBudgetFormOptions } from "@/features/budget-requests/queries";

export default async function NewBudgetRequestPage() {
  const result = await getBudgetFormOptions();
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่พบข้อมูลตั้งต้นสำหรับแบบฟอร์ม"} />
  ) : (
    <BudgetRequestWorkbookForm options={result.data} />
  );
}
