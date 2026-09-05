import {
  ChartNoAxesCombined,
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
  { label: "กำกับและตั้งค่าระบบ", href: "/admin", icon: ShieldCheck, adminOnly: true },
];

export function isCurrentNavigationPath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
