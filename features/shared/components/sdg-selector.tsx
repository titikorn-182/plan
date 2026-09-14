import { Check } from "lucide-react";
import { FieldError } from "@/components/ui/operation-form";
import { SDG_COLORS, SDG_OPTIONS, type SdgOption } from "@/features/shared/sdgs";

export function SdgSelector({
  errorId,
  errors,
  onChange,
  selected,
}: {
  errorId: string;
  errors?: string[];
  onChange: (value: SdgOption[]) => void;
  selected: readonly SdgOption[];
}) {
  return (
    <fieldset aria-describedby={errors?.length ? errorId : undefined}>
      <legend className="sr-only">เลือกเป้าหมายการพัฒนาที่ยั่งยืน</legend>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-stone-600">เลือกได้มากกว่า 1 เป้าหมาย</p>
        <p className="text-xs font-semibold tabular-nums text-stone-700" aria-live="polite">
          เลือกแล้ว {selected.length} เป้าหมาย
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SDG_OPTIONS.map((label, index) => {
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
                    onChange(
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
      <FieldError errors={errors} id={errorId} />
    </fieldset>
  );
}
