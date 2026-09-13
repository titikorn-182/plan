import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getCurrentNavigationHref,
  getVisibleNavigation,
  primaryNavigation,
} from "@/components/layout/navigation";
import { WorkspaceMenu } from "@/components/layout/workspace-menu";
import { ProjectsView } from "@/components/modules/projects-view";
import { createPagination } from "@/features/shared/pagination";
import type { ProjectRow } from "@/features/projects/types";
import type { ProjectFilters } from "@/features/projects/filters";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));

describe("workspace menu access", () => {
  it("makes every module available to Admin, including notifications and administration", () => {
    const items = getVisibleNavigation(["admin"]);
    expect(items).toEqual(primaryNavigation);
    expect(items.map((item) => item.href)).toContain("/notifications");
    expect(items.map((item) => item.href)).toContain("/admin");
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
    for (const item of items) {
      expect(existsSync(resolve("app/(workspace)", item.href.slice(1), "page.tsx"))).toBe(true);
    }
  });

  it.each(["staff", "user", "executive"] as const)(
    "keeps Admin-only menus hidden for %s",
    (role) => {
      expect(getVisibleNavigation([role]).some((item) => item.href === "/admin")).toBe(false);
    },
  );

  it("does not grant Admin menus when role information is missing", () => {
    expect(getVisibleNavigation([]).some((item) => item.adminOnly)).toBe(false);
  });

  it("recognizes Admin in a multi-role account", () => {
    expect(getVisibleNavigation(["staff", "admin"])).toEqual(primaryNavigation);
  });

  it.each([
    ["/", "/"],
    ["/projects/new", "/projects"],
    ["/reports/quarterly/new", "/reports/quarterly"],
    ["/reports/quarterly/record/edit", "/reports/quarterly"],
    ["/reports/project-results/new", "/reports/project-results"],
    ["/reports/project-results/record/edit", "/reports/project-results"],
    ["/notifications", "/notifications"],
    ["/projectsmith", undefined],
  ])("selects the most specific menu for %s", (pathname, href) => {
    expect(getCurrentNavigationHref(pathname!, primaryNavigation)).toBe(href);
  });

  it("renders a full labelled link for every Admin destination", () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceMenu, { pathname: "/reports/quarterly", roles: ["admin"] }),
    );
    expect(html).toContain("เมนูทั้งหมด");
    for (const item of primaryNavigation) expect(html).toContain(`href="${item.href}"`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain("disabled");
  });

  it("does not render an Admin link for Staff", () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceMenu, { pathname: "/projects", roles: ["staff"] }),
    );
    expect(html).not.toContain('href="/admin"');
  });
});

describe("project entry points", () => {
  const filters: ProjectFilters = {
    search: "",
    organizationId: "",
    health: "",
    status: "",
    minBudget: null,
    maxBudget: null,
    minProgress: null,
    maxProgress: null,
  };

  it("keeps the create action available before the first project exists", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectsView, {
        projects: [],
        pagination: createPagination(0, 1, 25),
        filters,
        organizations: [],
      }),
    );
    expect(html).toContain('href="/projects/new"');
    expect(html).toContain("สร้างข้อเสนอโครงการ");
    expect(html).toContain("ยังไม่มีโครงการ");
  });

  it("keeps pagination recovery and creation available on an empty later page", () => {
    const html = renderToStaticMarkup(
      createElement(ProjectsView, {
        projects: [],
        pagination: createPagination(30, 3, 25),
        filters,
        organizations: [],
      }),
    );
    expect(html).toContain('href="/projects/new"');
    expect(html).toContain('href="/projects?page=2"');
  });

  it("keeps only one create entry and preserves the edit link for a draft", () => {
    const project: ProjectRow = {
      uuid: "test-project",
      id: "TEST-1",
      title: "โครงการทดสอบเฉพาะในชุดทดสอบ",
      unit: "หน่วยงานทดสอบ",
      budget: 1000,
      spent: 0,
      progress: 0,
      health: "ปกติ",
      owner: "ผู้ทดสอบ",
      due: "30 ก.ย. 2570",
      status: "proposed",
      editable: true,
    };
    const html = renderToStaticMarkup(
      createElement(ProjectsView, {
        projects: [project],
        pagination: createPagination(1, 1, 25),
        filters,
        organizations: [],
      }),
    );
    expect(html.match(/href="\/projects\/new"/g)).toHaveLength(1);
    expect(html).toContain('href="/projects/test-project/edit"');
  });
});
