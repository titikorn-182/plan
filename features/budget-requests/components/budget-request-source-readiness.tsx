import { Check, CircleAlert } from "lucide-react";
import {
  BUDGET_REQUEST_SOURCE_SECTIONS,
  isBudgetRequestOrganizationCompatible,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";

export function BudgetRequestSourceReadiness({
  amount,
  fiscalYearId,
  organizationId,
  organizationName,
  values,
}: {
  amount: number;
  fiscalYearId: string;
  organizationId: string;
  organizationName: string;
  values: BudgetRequestSourceValues;
}) {
  const readiness = [
    { label: "กำหนดหน่วยงานและปีงบประมาณ", complete: Boolean(organizationId && fiscalYearId) },
    {
      label: "หน่วยงานตรงกับรหัสหน่วยงานย่อย",
      complete: isBudgetRequestOrganizationCompatible(values.organizationCode, organizationName),
    },
    {
      label: "ระบุโครงการและประเภทโครงการ",
      complete: Boolean(values.projectActivityName.trim().length >= 5 && values.projectType.trim()),
    },
    { label: "ระบุหัวหน้าโครงการ", complete: values.ownerName.trim().length >= 2 },
    { label: "ระบุวงเงินคำขอ", complete: amount > 0 },
    { label: "อธิบายหลักการและเหตุผล", complete: values.rationale.trim().length >= 20 },
  ];
  const readyCount = readiness.filter((item) => item.complete).length;

  return (
    <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[78px]">
      <header className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-bold">ตรวจความพร้อมก่อนส่ง</h2>
        <p className="mt-1 text-xs text-stone-500">
          พร้อมแล้ว {readyCount} จาก {readiness.length} รายการสำคัญ
        </p>
      </header>
      <div className="p-4">
        <ul className="space-y-2">
          {readiness.map((item) => (
            <li className="flex items-start gap-2 text-xs" key={item.label}>
              {item.complete ? (
                <Check className="mt-0.5 shrink-0 text-emerald-600" size={15} />
              ) : (
                <CircleAlert className="mt-0.5 shrink-0 text-orange-700" size={15} />
              )}
              <span className={item.complete ? "text-stone-600" : "text-stone-900"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <nav className="border-t border-stone-200 p-2" aria-label="ไปยังส่วนของแบบฟอร์ม">
        {BUDGET_REQUEST_SOURCE_SECTIONS.map((section) => (
          <a
            className="block px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-[#fff3ea] hover:text-[#c9440b]"
            href={`#section-${section.id}`}
            key={section.id}
          >
            {section.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}
