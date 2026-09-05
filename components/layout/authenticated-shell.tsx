import type { ReactNode } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { getReportingPeriod } from "@/lib/data/queries";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export async function AuthenticatedShell({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const [viewer, period] = await Promise.all([getViewer(), getReportingPeriod()]);
  return <WorkspaceShell title={title} actions={actions} viewer={viewer} period={period}>{children}</WorkspaceShell>;
}
