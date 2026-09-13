import { FieldError, FieldLabel, areaClass } from "@/components/ui/operation-form";
import { SdgSelector } from "@/components/ui/sdg-selector";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import type { SdgOption } from "@/features/shared/sdgs";

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
      <SdgSelector
        errorId="budget-sdgs-error"
        errors={errors?.["proposalDetails.sdgs"]}
        selected={selected as readonly SdgOption[]}
        onChange={onSelectionChange}
      />
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
