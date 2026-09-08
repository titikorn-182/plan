export const BUDGET_REQUEST_FISCAL_YEARS = [
  {
    buddhistYear: 2570,
    label: "ปีงบประมาณ 2570",
    cycleName: "รอบคำของบประมาณ 2570",
  },
  {
    buddhistYear: 2571,
    label: "ปีงบประมาณ 2571",
    cycleName: "รอบคำของบประมาณ 2571",
  },
  {
    buddhistYear: 2572,
    label: "ปีงบประมาณ 2572",
    cycleName: "รอบคำของบประมาณ 2572",
  },
] as const;

export const BUDGET_REQUEST_CYCLE_NAMES = BUDGET_REQUEST_FISCAL_YEARS.map(
  ({ cycleName }) => cycleName,
);
