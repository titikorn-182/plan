import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getReportingPeriod } from "@/features/shared/queries";
import { getViewer } from "@/lib/auth/viewer";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [viewer, period] = await Promise.all([getViewer(), getReportingPeriod()]);
  return (
    <WorkspaceShell viewer={viewer} period={period}>
      {children}
    </WorkspaceShell>
  );
}
