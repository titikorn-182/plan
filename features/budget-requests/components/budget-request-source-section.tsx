import { FieldError, FieldLabel, areaClass, fieldClass } from "@/components/ui/operation-form";
import {
  BUDGET_FUND_OPTIONS,
  BUDGET_ORGANIZATION_CODE_OPTIONS,
} from "@/features/budget-requests/proposal-details";
import { BUDGET_REQUEST_ORGANIZATIONS } from "@/features/budget-requests/organization-options";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import type {
  BudgetRequestSourceField,
  BudgetRequestSourceSection as SourceSection,
  BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";

function getFieldErrors(field: BudgetRequestSourceField, errors: BudgetRequestState["errors"]) {
  const actionFields: Partial<Record<BudgetRequestSourceField["key"], string>> = {
    ownerName: "ownerName",
    projectActivityName: "title",
    projectType: "projectType",
    rationale: "rationale",
    totalBudget: "amount",
  };
  const errorKey = field.proposalField
    ? `proposalDetails.${field.proposalField}`
    : actionFields[field.key];
  return errorKey ? errors?.[errorKey] : undefined;
}

function SourceField({
  field,
  errors,
  onChange,
  values,
}: {
  field: BudgetRequestSourceField;
  errors: BudgetRequestState["errors"];
  onChange: (key: BudgetRequestSourceField["key"], value: string) => void;
  values: BudgetRequestSourceValues;
}) {
  const fieldErrors = getFieldErrors(field, errors);
  const id = `budget-source-${field.key}`;
  const describedBy = field.help || fieldErrors?.length ? `${id}-description` : undefined;
  const common = {
    id,
    value: values[field.key],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => onChange(field.key, event.target.value),
    "aria-invalid": Boolean(fieldErrors?.length),
    "aria-describedby": describedBy,
  };
  const input =
    field.control === "textarea" ? (
      <textarea className={areaClass} maxLength={field.maxLength ?? 5_000} {...common} />
    ) : field.control === "date" ? (
      <input
        className={fieldClass}
        type="date"
        min={field.key === "endsOn" ? values.startsOn || undefined : undefined}
        {...common}
      />
    ) : field.control === "currency" ? (
      <div className="relative">
        <input
          className={`${fieldClass} pr-14 text-right font-semibold tabular-nums`}
          type="number"
          inputMode="decimal"
          min="0"
          max="999999999999"
          step="0.01"
          {...common}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-stone-500">
          บาท
        </span>
      </div>
    ) : field.control === "organization" ? (
      <select className={fieldClass} required={field.required} {...common}>
        <option value="">เลือกรหัสหน่วยงานย่อย</option>
        {BUDGET_ORGANIZATION_CODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value} — {option.label}
          </option>
        ))}
      </select>
    ) : field.control === "organization-name" ? (
      <select className={fieldClass} required={field.required} {...common}>
        <option value="">เลือกชื่อหน่วยงานย่อย</option>
        {BUDGET_REQUEST_ORGANIZATIONS.map((option) => (
          <option key={option.code} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    ) : field.control === "fund" ? (
      <select className={fieldClass} {...common}>
        <option value="">เลือกรหัสกองทุน</option>
        {BUDGET_FUND_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            กองทุน {option.code} — {option.name}
          </option>
        ))}
      </select>
    ) : (
      <input
        className={fieldClass}
        maxLength={field.maxLength ?? 300}
        required={field.required}
        autoComplete="off"
        {...common}
      />
    );

  return (
    <label className={field.control === "textarea" ? "md:col-span-2" : undefined}>
      <FieldLabel required={field.required}>{field.header}</FieldLabel>
      {input}
      {field.help || fieldErrors?.length ? (
        <span id={`${id}-description`}>
          {field.help ? (
            <span className="mt-1.5 block text-xs text-stone-500">{field.help}</span>
          ) : null}
          <FieldError errors={fieldErrors} />
        </span>
      ) : null}
    </label>
  );
}

export function BudgetRequestSourceSection({
  section,
  errors,
  onChange,
  values,
}: {
  section: SourceSection;
  errors: BudgetRequestState["errors"];
  onChange: (key: BudgetRequestSourceField["key"], value: string) => void;
  values: BudgetRequestSourceValues;
}) {
  return (
    <section className="scroll-mt-24 border border-stone-200 bg-white" id={`section-${section.id}`}>
      <header className="border-b border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-stone-950">{section.title}</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-600">{section.description}</p>
      </header>
      <div className="grid gap-x-5 gap-y-4 p-5 md:grid-cols-2 sm:p-6">
        {section.fields.map((field) => (
          <SourceField
            key={field.key}
            field={field}
            errors={errors}
            onChange={onChange}
            values={values}
          />
        ))}
      </div>
    </section>
  );
}
