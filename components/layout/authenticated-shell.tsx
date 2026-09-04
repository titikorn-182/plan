import type { ReactNode } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export async function AuthenticatedShell({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const viewer = await getViewer();
  return <WorkspaceShell title={title} actions={actions} viewer={viewer}>{children}</WorkspaceShell>;
}
