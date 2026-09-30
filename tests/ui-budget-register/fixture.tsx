import { createRoot } from "react-dom/client";
import { ApprovedEditFixture } from "./edit-fixture";
import { ProjectFixture } from "./project-fixture";
import { BudgetRequestsView } from "@/features/budget-requests/components/budget-requests-view";
import type { BudgetRequest } from "@/features/budget-requests/types";
import { createPagination } from "@/features/shared/pagination";
import { budgetRequestEditDeniedReason } from "@/features/budget-requests/edit-policy";
import "@openfonts/sarabun_all/index.css";
import "@/app/globals.css";

const request: BudgetRequest = {
  uuid: "00000000-0000-4000-8000-000000000001",
  id: "BR-TEST-001",
  version: 3,
  title: "โครงการทดสอบเมนูทะเบียนคำของบประมาณ",
  unit: "สำนักงานเลขานุการ",
  subOrganizationName: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
  subActivityNames: ["กิจกรรมทดสอบเท่านั้น ไม่ใช่ข้อมูลจริง"],
  category: "ดำเนินงาน",
  amount: 10000,
  status: "ฉบับร่าง",
  updated: "30 ก.ย. 2569",
  editable: true,
  deletable: true,
};
const requests: BudgetRequest[] = [
  request,
  {
    ...request,
    uuid: "00000000-0000-4000-8000-000000000002",
    id: "BR-TEST-002",
    status: "อนุมัติแล้ว",
    editable: false,
    deletable: false,
  },
];
const staff = new URLSearchParams(location.search).has("staff");
const viewer = { id: "owner", roles: [staff ? "staff" : "admin"] };
const authorizedRequests = requests.map((item, index) => {
  const denied = budgetRequestEditDeniedReason(viewer, {
    status: index === 0 ? "draft" : "approved",
    ownerId: "owner",
    lockedAt: null,
  });
  return { ...item, editable: denied === null, editDeniedReason: denied ?? undefined };
});
window.archiveCalls = [];
createRoot(document.getElementById("root")!).render(
  <main className="min-w-0 p-4" style={{ fontFamily: "Sarabun, sans-serif" }}>
    {new URLSearchParams(location.search).has("projects") ? <ProjectFixture /> : new URLSearchParams(location.search).has("edit") ? (
      <ApprovedEditFixture />
    ) : (
      <BudgetRequestsView
        requests={authorizedRequests}
        pagination={createPagination(2, 1, 20)}
        canDelete={!staff}
      />
    )}
  </main>,
);
