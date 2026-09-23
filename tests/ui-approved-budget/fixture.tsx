import { createRoot } from "react-dom/client";
import { ProjectForm } from "@/features/projects/components/project-form";
import { formOptions, sourceA } from "./fixtures";
import "@openfonts/sarabun_all/index.css";
import "@/app/globals.css";
import "./fixture.css";

const options = structuredClone(formOptions);
const parameters = new URLSearchParams(window.location.search);
if (parameters.has("empty")) options.budgetRequests = [];
if (parameters.has("existing")) {
  options.record = {
    id: "93bb7a9a-40e8-4bb1-b3fd-f604146609af",
    code: "PJ700001",
    version: 2,
    organizationId: sourceA.organizationId,
    fiscalYearId: sourceA.fiscalYearId,
    budgetRequestId: sourceA.budgetRequestId,
    title: "ชื่อกิจกรรมที่แก้ไขในฉบับร่าง",
    projectType: sourceA.details.characteristics[0],
    ownerName: sourceA.ownerName,
    coordinatorName: sourceA.details.responsiblePeople[0].name,
    approvedBudget: sourceA.requestedAmount,
    disbursementTarget: 40,
    startsOn: sourceA.startsOn,
    endsOn: sourceA.endsOn,
    status: "proposed",
    pendingApproval: false,
    proposalDetails: structuredClone(sourceA.details),
  };
}

createRoot(document.getElementById("root")!).render(
  <div className="fixture-workspace">
    <ProjectForm options={options} />
  </div>,
);
