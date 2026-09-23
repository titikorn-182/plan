import { createRoot } from "react-dom/client";
import { BudgetRequestDetailView } from "@/features/budget-requests/components/budget-request-detail";
import { detailedRequest, emptyRequest, legacyRequest } from "./fixtures";
import "@openfonts/sarabun_all/index.css";
import "@/app/globals.css";
import "./fixture.css";

const parameters = new URLSearchParams(window.location.search);
const record = parameters.has("legacy")
  ? legacyRequest
  : parameters.has("empty")
    ? emptyRequest
    : detailedRequest;

createRoot(document.getElementById("root")!).render(
  <main className="fixture-workspace">
    <BudgetRequestDetailView record={record} />
  </main>,
);
