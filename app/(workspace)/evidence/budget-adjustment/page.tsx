import { BudgetAdjustmentForm } from "@/features/budget-adjustments/components/budget-adjustment-form";
import { getViewer } from "@/lib/auth/viewer";
import { DataError } from "@/components/ui/data-state";

export default async function BudgetAdjustmentPage() {
  const viewer = await getViewer();
  if (!viewer.role)
    return <DataError message="บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ" />;
  return <BudgetAdjustmentForm />;
}
