type BudgetSubActivitySource = {
  subActivityName: unknown;
  expenseItems: unknown;
};

/** Include both manually entered and grouped-import sub-activities without duplicates. */
export function getBudgetSubActivityNames(source: BudgetSubActivitySource): string[] {
  const names = new Set<string>();
  const addName = (value: unknown) => {
    if (typeof value !== "string") return;
    const name = value.trim();
    if (name) names.add(name);
  };

  addName(source.subActivityName);
  if (Array.isArray(source.expenseItems)) {
    const expenseItems: readonly unknown[] = source.expenseItems;
    for (const item of expenseItems) {
      if (typeof item === "object" && item !== null && "subActivityName" in item) {
        addName(item.subActivityName);
      }
    }
  }
  return [...names];
}
