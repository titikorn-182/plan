import type { OperationState } from "@/features/shared/action-state";

// The server runs the real action and PostgreSQL migrations; only transport differs.
export async function saveDisbursementAction(previous: OperationState, data: FormData) {
  const response = await fetch("/test-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previous, entries: Object.fromEntries(data) }),
  });
  return response.json();
}
