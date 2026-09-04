import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { BudgetRequestForm } from "@/components/modules/budget-request-form";
import { DataError } from "@/components/ui/data-state";
import { getBudgetFormOptions } from "@/lib/data/queries";

export default async function NewBudgetRequestPage() {
  const result = await getBudgetFormOptions();
  return (
    <AuthenticatedShell title="สร้างคำของบประมาณ">
      {result.error || !result.data ? <DataError message={result.error ?? "ไม่พบข้อมูลตั้งต้นสำหรับแบบฟอร์ม"} /> : <BudgetRequestForm options={result.data} />}
    </AuthenticatedShell>
  );
}
