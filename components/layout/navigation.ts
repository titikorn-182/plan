import {
  ChartNoAxesCombined,
  Bell,
  FileChartColumn,
  FileCheck2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  Stamp,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/features/auth/types";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const primaryNavigation: readonly NavigationItem[] = [
  { label: "หน้าหลักฐาน", href: "/", icon: LayoutDashboard },
  { label: "ภาพรวมผู้บริหาร", href: "/reports", icon: ChartNoAxesCombined },
  { label: "แผนและคำของบ", href: "/budget-requests", icon: FileText },
  { label: "โครงการและการดำเนินงาน", href: "/projects", icon: FolderKanban },
  { label: "รายงานรายไตรมาส", href: "/reports/quarterly", icon: FileChartColumn },
  { label: "เบิกจ่ายงบประมาณ", href: "/disbursements", icon: WalletCards },
  { label: "KPI และคุณภาพ", href: "/kpi", icon: Target },
  { label: "หลักฐานและเอกสาร", href: "/evidence", icon: FileCheck2 },
  { label: "Workflow อนุมัติ", href: "/approvals", icon: Stamp },
  { label: "การแจ้งเตือน", href: "/notifications", icon: Bell },
  { label: "กำกับและตั้งค่าระบบ", href: "/admin", icon: ShieldCheck, adminOnly: true },
];

export function getVisibleNavigation(roles: readonly AppRole[]): readonly NavigationItem[] {
  return primaryNavigation.filter((item) => !item.adminOnly || roles.includes("admin"));
}

export function getCurrentNavigationHref(
  pathname: string,
  items: readonly NavigationItem[],
): string | undefined {
  return items
    .filter((item) => isCurrentNavigationPath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;
}

const WORKSPACE_TITLES: ReadonlyArray<{
  matches: (pathname: string) => boolean;
  title: string;
}> = [
  {
    matches: (pathname) => /^\/budget-requests\/[^/]+\/edit$/.test(pathname),
    title: "แก้ไขคำของบประมาณ",
  },
  { matches: (pathname) => pathname === "/budget-requests/new", title: "สร้างคำของบประมาณ" },
  { matches: (pathname) => pathname === "/budget-requests", title: "คำของบประมาณประจำปี" },
  {
    matches: (pathname) => /^\/projects\/[^/]+\/edit$/.test(pathname),
    title: "แก้ไขข้อเสนอโครงการ",
  },
  { matches: (pathname) => pathname === "/projects/new", title: "สร้างข้อเสนอโครงการ" },
  { matches: (pathname) => pathname === "/projects", title: "บริหารกิจกรรมและโครงการ" },
  {
    matches: (pathname) => /^\/reports\/quarterly\/[^/]+\/edit$/.test(pathname),
    title: "แก้ไขรายงานรายไตรมาส",
  },
  {
    matches: (pathname) => pathname === "/reports/quarterly/new",
    title: "บันทึกผลดำเนินงานรายไตรมาส",
  },
  {
    matches: (pathname) => pathname === "/reports/quarterly",
    title: "ติดตามผลการดำเนินงานรายไตรมาส",
  },
  { matches: (pathname) => pathname === "/reports", title: "รายงานและส่งออกข้อมูล" },
  { matches: (pathname) => pathname === "/disbursements/new", title: "บันทึกการเบิกจ่าย" },
  { matches: (pathname) => pathname === "/disbursements", title: "ติดตามการเบิกจ่ายงบประมาณ" },
  { matches: (pathname) => /^\/kpi\/[^/]+\/edit$/.test(pathname), title: "กรอกและรับรองผล KPI" },
  { matches: (pathname) => pathname === "/kpi", title: "KPI Dashboard — EdPEx & AUN-QA" },
  { matches: (pathname) => pathname === "/evidence", title: "หลักฐานและเอกสาร" },
  { matches: (pathname) => pathname === "/approvals", title: "Workflow อนุมัติ" },
  { matches: (pathname) => pathname === "/notifications", title: "การแจ้งเตือน" },
  { matches: (pathname) => pathname === "/admin", title: "ผู้ใช้ สิทธิ์ และข้อมูลหลัก" },
];

export function getWorkspaceTitle(pathname: string): string {
  return WORKSPACE_TITLES.find((item) => item.matches(pathname))?.title ?? "ระบบบริหารแผน";
}

export function isCurrentNavigationPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
