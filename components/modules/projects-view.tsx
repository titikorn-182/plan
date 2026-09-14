"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyData } from "@/components/ui/data-state";
import { RegisterSection } from "@/components/ui/module-primitives";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { ProjectFilterPanel } from "@/components/modules/projects/project-filter-panel";
import { ProjectFilterToggle } from "@/components/modules/projects/project-filter-toggle";
import { ProjectInspector } from "@/components/modules/projects/project-inspector";
import { ProjectsTable } from "@/components/modules/projects/projects-table";
import {
  ProjectHealthBudgetSummary,
  ProjectsSummary,
} from "@/components/modules/projects/projects-summary";
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
      <ProjectsSummary
        projects={projects}
        total={pagination.total}
        createAction={createProjectLink}
      />
      {filterPanel}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <RegisterSection title="ทะเบียนโครงการ" aside={filterToggle}>
          <ProjectsTable projects={projects} selectedId={selectedId} onSelect={setSelectedId} />
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
