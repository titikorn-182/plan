import { ProjectsView } from "@/features/projects/components/projects-view";
import { parseProjectFilters } from "@/features/projects/filters";
import { createPagination } from "@/features/shared/pagination";
import type { ProjectRow } from "@/features/projects/types";

export function ProjectFixture() {
  const staff = new URLSearchParams(location.search).has("staff");
  const reviewing = new URLSearchParams(location.search).has("review");
  const proposal: ProjectRow = {
    uuid: "00000000-0000-4000-8000-000000000001",
    id: "PR-TEST-001",
    title: "โครงการทดสอบเมนูแก้ไขและลบ (ข้อมูลทดสอบ)",
    unit: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
    owner: "เจ้าหน้าที่ทดสอบ",
    budget: 10000,
    spent: 0,
    progress: 0,
    health: "ปกติ",
    due: "30 ก.ย. 2570",
    status: "proposed",
    approvalState: "awaiting_submission",
    editable: true,
    deletable: !staff,
    version: 3,
  };
  const projects: ProjectRow[] = [
    proposal,
    {
      ...proposal,
      uuid: "00000000-0000-4000-8000-000000000002",
      id: "PR-TEST-002",
      title: "โครงการที่อยู่ระหว่างอนุมัติ (ข้อมูลทดสอบ)",
      approvalState: "unit_review",
      editable: false,
      deletable: false,
    },
    {
      ...proposal,
      uuid: "00000000-0000-4000-8000-000000000003",
      id: "PR-TEST-003",
      title: "โครงการที่อนุมัติแล้ว (ข้อมูลทดสอบ)",
      canRequestRevision: staff && !reviewing,
      canReviewRevision: !staff && reviewing,
      revision: reviewing
        ? {
            id: "00000000-0000-4000-8000-000000000004",
            status: "pending",
            reason: "ขอปรับรายละเอียดกิจกรรมและวันดำเนินการ (ข้อมูลทดสอบ)",
            decisionReason: null,
          }
        : undefined,
      status: "active",
      approvalState: "approved",
      editable: false,
      deletable: false,
    },
  ];
  if (new URLSearchParams(location.search).has("approval-states")) {
    projects.push({
      ...proposal,
      uuid: "00000000-0000-4000-8000-000000000005",
      id: "PR-TEST-005",
      title: "โครงการรอผู้บริหารอนุมัติ (ข้อมูลทดสอบ)",
      approvalState: "executive_review",
      editable: false,
      deletable: false,
    });
  }
  return (
    <ProjectsView
      projects={projects}
      pagination={createPagination(projects.length, 1, 20)}
      filters={parseProjectFilters({})}
      organizations={[]}
    />
  );
}
