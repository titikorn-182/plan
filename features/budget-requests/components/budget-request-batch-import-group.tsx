import { ChevronDown } from "lucide-react";
import { FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { BudgetRequestBatchGroup } from "@/features/budget-requests/batch-import";

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type BudgetRequestBatchEditableKey = "ownerName" | "rationale" | "startsOn" | "endsOn";

function effectiveWarnings(group: BudgetRequestBatchGroup): string[] {
  return group.warnings.filter(
    (warning) => warning !== "ยังไม่ระบุหัวหน้าโครงการ" || !group.values.ownerName.trim(),
  );
}

export function BudgetRequestBatchImportGroup({
  checked,
  disabled,
  group,
  onCheckedChange,
  onValueChange,
}: {
  checked: boolean;
  disabled: boolean;
  group: BudgetRequestBatchGroup;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (key: BudgetRequestBatchEditableKey, value: string) => void;
}) {
  const warnings = effectiveWarnings(group);
  const missingOwner = group.values.ownerName.trim().length < 2;

  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 hover:bg-[#fff8f4] sm:px-5 lg:grid-cols-[32px_minmax(0,1fr)_110px_140px_120px_22px] lg:items-center">
        <span onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#d83b0b]"
            checked={checked}
            disabled={group.errors.length > 0 || disabled}
            aria-label={`เลือกคำขอ ${group.values.projectActivityName || group.id}`}
            onChange={(event) => onCheckedChange(event.target.checked)}
          />
        </span>
        <span className="min-w-0">
          <b className="block text-sm text-stone-950">
            {group.values.projectActivityName || "ยังไม่มีชื่อโครงการ"}
          </b>
          <small className="mt-0.5 block text-xs text-stone-500">รหัส {group.id}</small>
        </span>
        <span className="text-xs text-stone-600">
          <b className="tabular-nums text-stone-900">{group.rowNumbers.length}</b> แถว
        </span>
        <span className="text-xs font-bold tabular-nums text-stone-900">
          {currency.format(group.totalAmount)} บาท
        </span>
        <span
          className={`text-xs font-bold ${group.errors.length > 0 ? "text-red-700" : missingOwner || warnings.length > 0 ? "text-orange-800" : "text-emerald-700"}`}
        >
          {group.errors.length > 0
            ? "ไฟล์มีข้อผิดพลาด"
            : missingOwner
              ? "ต้องระบุหัวหน้า"
              : warnings.length > 0
                ? `${warnings.length} จุดให้ตรวจ`
                : "พร้อมบันทึก"}
        </span>
        <ChevronDown
          className="text-stone-500 transition-transform group-open:rotate-180"
          size={18}
        />
      </summary>
      <div className="border-t border-stone-100 bg-stone-50 px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label>
            <FieldLabel required>หัวหน้าโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={group.values.ownerName}
              onChange={(event) => onValueChange("ownerName", event.target.value)}
              maxLength={180}
              disabled={disabled}
              placeholder="กรอกชื่อ-นามสกุล"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <FieldLabel>วันที่เริ่ม</FieldLabel>
              <input
                className={fieldClass}
                type="date"
                value={group.values.startsOn}
                onChange={(event) => onValueChange("startsOn", event.target.value)}
                disabled={disabled}
              />
            </label>
            <label>
              <FieldLabel>วันที่สิ้นสุด</FieldLabel>
              <input
                className={fieldClass}
                type="date"
                value={group.values.endsOn}
                onChange={(event) => onValueChange("endsOn", event.target.value)}
                disabled={disabled}
              />
            </label>
          </div>
          <label className="lg:col-span-2">
            <FieldLabel>หลักการและเหตุผล</FieldLabel>
            <textarea
              className={`${fieldClass} min-h-24 py-3`}
              value={group.values.rationale}
              onChange={(event) => onValueChange("rationale", event.target.value)}
              maxLength={5_000}
              disabled={disabled}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          แถวต้นทาง {group.rowNumbers.join(", ")} · รายละเอียดค่าใช้จ่าย{" "}
          {group.expenseItems.length.toLocaleString("th-TH")} รายการ
        </p>
        {group.errors.length > 0 ? (
          <ul className="mt-3 space-y-1 border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {group.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 border border-orange-200 bg-orange-50 p-3 text-xs text-orange-950">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
