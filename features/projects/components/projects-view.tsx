"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyData } from "@/components/ui/data-state";
import { RegisterSection } from "@/components/ui/module-primitives";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { ProjectFilterPanel } from "@/features/projects/components/project-filter-panel";
import { ProjectFilterToggle } from "@/features/projects/components/project-filter-toggle";
import { ProjectInspector } from "@/features/projects/components/project-inspector";
import { ProjectsTable } from "@/features/projects/components/projects-table";
import { ProjectDeleteDialog } from "@/features/projects/components/project-delete-dialog";
import {
  ProjectHealthBudgetSummary,
  ProjectsSummary,
} from "@/features/projects/components/projects-summary";
import {
  hasProjectFilters,
  projectFilterQuery,
  type ProjectFilters,
} from "@/features/projects/filters";
import type { ProjectRow } from "@/features/projects/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import type { OrganizationOption } from "@/features/shared/types";

export function ProjectsView({
  projects,
  pagination,
  filters,
  organizations,
}: {
  projects: ProjectRow[];
  pagination: PaginationMeta;
  filters: ProjectFilters;
  organizations: OrganizationOption[];
}) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const [showFilters, setShowFilters] = useState(hasProjectFilters(filters));
  const [deleteProject, setDeleteProject] = useState<ProjectRow | null>(null);
  const [notice, setNotice] = useState("");
  const feedback = (
    <div role="status" aria-live="polite">
      {notice && (
        <p className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
    </div>
  );
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0];
  const createProjectLink = (
    <Link
      className="inline-flex items-center justify-center gap-2 bg-[#cf430c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ad3507]"
      href="/projects/new"
    >
      <Plus size={17} /> สร้างข้อเสนอโครงการ
    </Link>
  );
  const filterToggle = (
    <ProjectFilterToggle
      expanded={showFilters}
      filters={filters}
      onToggle={() => setShowFilters((current) => !current)}
    />
  );
  const filterPanel = showFilters ? (
    <ProjectFilterPanel filters={filters} organizations={organizations} />
  ) : null;

  if (!selected) {
    return (
      <div className="space-y-4">
        {feedback}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-stone-200 bg-white p-4">
          {filterToggle}
          {createProjectLink}
        </div>
        {filterPanel}
        <RegisterSection title="ทะเบียนโครงการ">
          <EmptyData
            title={hasProjectFilters(filters) ? "ไม่พบโครงการตามตัวกรอง" : "ยังไม่มีโครงการ"}
            detail={
              hasProjectFilters(filters)
                ? "ลองล้างตัวกรองหรือปรับช่วงข้อมูลให้กว้างขึ้น"
                : "โครงการที่อยู่ในขอบเขตสิทธิ์ของคุณจะแสดงที่นี่"
            }
          />
          <PaginationNav
            basePath="/projects"
            pagination={pagination}
            query={projectFilterQuery(filters)}
          />
        </RegisterSection>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {feedback}
      {deleteProject && (
        <ProjectDeleteDialog
          key={deleteProject.uuid}
          request={deleteProject}
          onClose={() => setDeleteProject(null)}
          onDeleted={(message) => {
            setDeleteProject(null);
            setNotice(message);
          }}
        />
      )}
      <ProjectsSummary
        projects={projects}
        total={pagination.total}
        createAction={createProjectLink}
      />
      {filterPanel}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <RegisterSection title="ทะเบียนโครงการ" aside={filterToggle}>
          <ProjectsTable
            projects={projects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={setDeleteProject}
          />
          <PaginationNav
            basePath="/projects"
            pagination={pagination}
            query={projectFilterQuery(filters)}
          />
        </RegisterSection>
        <ProjectInspector project={selected} />
      </div>
      <ProjectHealthBudgetSummary projects={projects} />
    </div>
  );
}
