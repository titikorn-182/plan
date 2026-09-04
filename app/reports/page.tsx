import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ReportsHub } from "@/components/modules/reports-hub";

export default function ReportsPage() {
  return (
    <AuthenticatedShell title="รายงานและส่งออกข้อมูล">
      <ReportsHub />
    </AuthenticatedShell>
  );
}
