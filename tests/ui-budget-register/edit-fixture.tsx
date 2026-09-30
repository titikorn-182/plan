import { BudgetRequestWorkbookForm } from "@/features/budget-requests/components/budget-request-workbook-form";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import { TEST_MASTER_DATA } from "@/tests/fixtures/master-data";

export function ApprovedEditFixture() {
  return (
    <BudgetRequestWorkbookForm
      options={{
        organizations: [{ id: "org", name: "สำนักงานเลขานุการ-งานแผนและงบประมาณ" }],
        fiscalYears: [
          { id: TEST_MASTER_DATA.fiscalYearId, label: "ปีงบประมาณ 2570", budgetCycleId: "cycle" },
        ],
        masterData: [TEST_MASTER_DATA],
        record: {
          id: "approved-test",
          code: "BR-APPROVED-TEST",
          version: 3,
          title: "โครงการทดสอบการแก้ไขวงเงิน",
          organizationId: "org",
          fiscalYearId: TEST_MASTER_DATA.fiscalYearId,
          budgetCycleId: "cycle",
          projectType: "2 โครงการประจำตามภารกิจ",
          ownerName: "ผู้ทดสอบ",
          rationale: "ข้อมูลสมมติสำหรับทดสอบเท่านั้น",
          amount: 10000,
          approvedAmount: 9000,
          expenseBreakdown: null,
          status: "approved",
          proposalDetails: {
            ...createEmptyBudgetProposalDetails(),
            organizationCode: "2301",
            organizationName: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
          },
        },
      }}
    />
  );
}
