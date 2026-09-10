import { Check } from "lucide-react";
import { FieldError, FieldLabel, areaClass } from "@/components/ui/operation-form";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import { BUDGET_SDG_OPTIONS } from "@/features/budget-requests/proposal-details";

const SDG_COLORS = [
  { background: "#e5243b", foreground: "#ffffff" },
  { background: "#dda63a", foreground: "#201a0c" },
  { background: "#4c9f38", foreground: "#ffffff" },
  { background: "#c5192d", foreground: "#ffffff" },
  { background: "#ff3a21", foreground: "#ffffff" },
  { background: "#26bde2", foreground: "#102126" },
  { background: "#fcc30b", foreground: "#211d05" },
  { background: "#a21942", foreground: "#ffffff" },
  { background: "#fd6925", foreground: "#211008" },
  { background: "#dd1367", foreground: "#ffffff" },
  { background: "#fd9d24", foreground: "#211409" },
  { background: "#bf8b2e", foreground: "#211909" },
  { background: "#3f7e44", foreground: "#ffffff" },
  { background: "#0a97d9", foreground: "#ffffff" },
  { background: "#56c02b", foreground: "#102108" },
  { background: "#00689d", foreground: "#ffffff" },
  { background: "#19486a", foreground: "#ffffff" },
] as const;

export function BudgetRequestSdgSection({
  alignmentDescription,
  errors,
  onAlignmentChange,
  onSelectionChange,
  selected,
}: {
  alignmentDescription: string;
  errors: BudgetRequestState["errors"];
  onAlignmentChange: (value: string) => void;
  onSelectionChange: (value: string[]) => void;
  selected: readonly string[];
}) {
  return (
    <div className="md:col-span-2">
      <fieldset>
        <legend className="sr-only">เลือกเป้าหมายการพัฒนาที่ยั่งยืน</legend>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-stone-600">เลือกได้มากกว่า 1 เป้าหมาย</p>
          <p className="text-xs font-semibold tabular-nums text-stone-700" aria-live="polite">
            เลือกแล้ว {selected.length} เป้าหมาย
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUDGET_SDG_OPTIONS.map((label, index) => {
            const checked = selected.includes(label);
            const description = label.replace(/^SDG \d+ /, "");
            const color = SDG_COLORS[index];

            return (
              <label
                className={`group flex min-h-20 cursor-pointer items-stretch border bg-white transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-orange-500 ${checked ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-orange-300 hover:bg-[#fff8f4]"}`}
                key={label}
              >
                <span
                  className="flex w-14 shrink-0 items-center justify-center text-xl font-black tabular-nums"
                  style={{ backgroundColor: color.background, color: color.foreground }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
                  <input
                    className="h-4 w-4 shrink-0 accent-[#cf430c]"
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onSelectionChange(
                        event.target.checked
                          ? [...selected, label]
                          : selected.filter((item) => item !== label),
                      )
                    }
                  />
                  <span className="min-w-0 text-sm font-semibold leading-5 text-stone-800">
                    <span className="block text-xs font-bold text-stone-500">SDG {index + 1}</span>
                    {description}
                  </span>
                  {checked ? (
                    <Check
                      className="ml-auto shrink-0 text-orange-700"
                      size={17}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError errors={errors?.["proposalDetails.sdgs"]} id="budget-sdgs-error" />
      </fieldset>

      <label className="mt-5 block">
        <FieldLabel>คำอธิบายความเชื่อมโยง</FieldLabel>
        <textarea
          className={areaClass}
          value={alignmentDescription}
          onChange={(event) => onAlignmentChange(event.target.value)}
          placeholder="อธิบายว่าโครงการหรือกิจกรรมสนับสนุน SDG ที่เลือกอย่างไร"
          maxLength={5_000}
          aria-invalid={Boolean(errors?.["proposalDetails.alignmentDescription"]?.length)}
          aria-describedby="budget-sdg-alignment-error"
        />
        <FieldError
          errors={errors?.["proposalDetails.alignmentDescription"]}
          id="budget-sdg-alignment-error"
        />
      </label>
    </div>
  );
}
