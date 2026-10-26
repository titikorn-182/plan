import { createRoot } from "react-dom/client";
import { BudgetDecisionForm } from "@/features/approvals/components/budget-decision-form";
import { BudgetRequestDetailView } from "@/features/budget-requests/components/budget-request-detail";
import { detailedRequest } from "../ui-budget-detail/fixtures";
import "@openfonts/sarabun_all/index.css";
import "@/app/globals.css";
import "../ui-budget-detail/fixture.css";

const scenario = await (await fetch(`/test-reset${window.location.search}`)).json();
createRoot(document.getElementById("root")!).render(
  <main className="fixture-workspace space-y-5">
    <BudgetRequestDetailView
      record={{
        ...detailedRequest,
        amount: 1000,
        title: "คำขอทดสอบการพิจารณาวงเงิน",
        id: scenario.budgetId,
      }}
    />
    <BudgetDecisionForm task={scenario.task} version={scenario.version} requestedAmount={1000} />
  </main>,
);
