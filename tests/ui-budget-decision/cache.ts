// Next's render invalidation is exercised in the full-stack CI suite.
export function revalidatePath() {}
export function useRouter() {
  return { refresh: () => window.location.reload() };
}
