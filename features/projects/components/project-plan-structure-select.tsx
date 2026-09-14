"use client";

import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { PlanStructureOption } from "@/features/shared/master-data";
import type {
  ProjectPlanStructureLevel,
  ProjectPlanStructureValue,
} from "@/features/projects/plan-structure";

export function ProjectPlanStructureSelect({
  label,
  level,
  valueType,
  value,
  options,
  disabled,
  errors,
  onChange,
}: {
  label: string;
  level: ProjectPlanStructureLevel;
  valueType: ProjectPlanStructureValue;
  value: string;
  options: readonly PlanStructureOption[];
  disabled: boolean;
  errors?: string[];
  onChange: (value: string) => void;
}) {
  const hasUnlistedValue =
    value.length > 0 && !options.some((option) => option[valueType] === value);
  const id = `project-plan-${level}-${valueType}`;

  return (
    <label htmlFor={id}>
      <FieldLabel>{label}</FieldLabel>
      <select
        className={fieldClass}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
      >
        <option value="">เลือก{label}</option>
        {hasUnlistedValue ? <option value={value}>ข้อมูลเดิม — {value}</option> : null}
        {options.map((option) => (
          <option key={option.code} value={option[valueType]}>
            {option[valueType]}
          </option>
        ))}
      </select>
      <FieldError errors={errors} id={`${id}-error`} />
    </label>
  );
}
