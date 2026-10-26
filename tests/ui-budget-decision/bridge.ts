import type { OperationState } from "@/features/shared/action-state";

// Only the transport is replaced. The fixture server runs the production action
// and SQL against disposable PGlite; no hosted credentials are loaded.
export async function actOnApprovalAction(
  previous: OperationState,
  data: FormData,
): Promise<OperationState> {
  const response = await fetch("/test-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previous, entries: Object.fromEntries(data) }),
  });
  return response.json();
}
