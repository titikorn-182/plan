import { AlertTriangle, CalendarClock, Check, CircleDollarSign } from "lucide-react";
import { RegisterSection } from "@/components/ui/module-primitives";
import { formatThaiInteger, formatThaiNumber } from "@/features/shared/formatters";
import type { ProjectRow } from "@/features/projects/types";

export function ProjectsSummary({
  projects,
  total,
  createAction,
}: {
  projects: ProjectRow[];
  total: number;
  createAction: React.ReactNode;
}) {
  const activeCount = projects.filter((item) => item.progress > 0 && item.progress < 100).length;
  const watchCount = projects.filter(
    (item) => item.health === "เฝ้าระวัง" || item.health === "เสี่ยงสูง",
  ).length;
  const delayedCount = projects.filter((item) => item.health === "ล่าช้า").length;

  return (
    <section className="grid border border-stone-200 bg-white lg:grid-cols-[1fr_auto]">
      <div className="grid sm:grid-cols-4">
        {[
          { n: total, label: "โครงการทั้งหมด" },
          { n: activeCount, label: "กำลังดำเนินงาน (หน้านี้)" },
          { n: watchCount, label: "ต้องเฝ้าระวัง (หน้านี้)" },
          { n: delayedCount, label: "ล่าช้า (หน้านี้)" },
        ].map((item, index) => (
          <article
            className={`flex items-center gap-3 px-5 py-4 ${index < 3 ? "border-b border-stone-200 sm:border-r sm:border-b-0" : ""}`}
            key={item.label}
          >
            <strong
              className={`text-2xl tabular-nums ${index > 1 ? "text-[#d8460b]" : "text-stone-950"}`}
            >
              {formatThaiInteger(item.n)}
            </strong>
            <span className="text-xs text-stone-600">{item.label}</span>
          </article>
        ))}
      </div>
      {createAction}
    </section>
  );
}

export function ProjectHealthBudgetSummary({ projects }: { projects: ProjectRow[] }) {
  const cards = [
    {
      label: "ปกติ",
      amount:
        projects
          .filter((item) => item.health === "ปกติ")
          .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
      icon: Check,
      color: "text-emerald-700",
    },
    {
      label: "เฝ้าระวัง",
      amount:
        projects
          .filter((item) => item.health === "เฝ้าระวัง")
          .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
      icon: CalendarClock,
      color: "text-orange-700",
    },
    {
      label: "เสี่ยงสูง/ล่าช้า",
      amount:
        projects
          .filter((item) => item.health === "เสี่ยงสูง" || item.health === "ล่าช้า")
          .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
      icon: AlertTriangle,
      color: "text-red-700",
    },
    {
      label: "คงเหลือรวม",
      amount: projects.reduce((sum, item) => sum + item.budget - item.spent, 0) / 1_000_000,
      icon: CircleDollarSign,
      color: "text-sky-800",
    },
  ];

  return (
    <RegisterSection
      title="ภาพรวมวงเงินตามสุขภาพโครงการ"
      aside={<span className="text-xs text-stone-500">หน่วย: ล้านบาท</span>}
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, amount, icon: Icon, color }, index) => (
          <article
            className={`flex items-center gap-4 px-5 py-5 ${index < 3 ? "border-b border-stone-200 sm:border-r xl:border-b-0" : ""}`}
            key={label}
          >
            <Icon size={23} className={color} />
            <span>
              <small className="block text-stone-500">{label}</small>
              <b className="mt-1 block text-xl tabular-nums">
                {formatThaiNumber(amount, { maximumFractionDigits: 2 })}
              </b>
            </span>
          </article>
        ))}
      </div>
    </RegisterSection>
  );
}
