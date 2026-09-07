import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getReportingContext } from "@/features/shared/queries";
import { getViewer } from "@/lib/auth/viewer";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [viewer, reporting] = await Promise.all([getViewer(), getReportingContext()]);
  return (
    <WorkspaceShell viewer={viewer} period={reporting.period} fiscalYears={reporting.fiscalYears}>
      {children}
    </WorkspaceShell>
  );
}
