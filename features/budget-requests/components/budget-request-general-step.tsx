import { areaClass, FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { BudgetRequestFormSection } from "@/features/budget-requests/components/budget-request-form-section";
import { getProposalFieldErrors } from "@/features/budget-requests/components/budget-request-step-types";
import type { BudgetProposalStepProps } from "@/features/budget-requests/components/budget-request-step-types";
import {
  BUDGET_ORGANIZATION_CODE_OPTIONS,
  BUDGET_PROJECT_TYPE_SUGGESTIONS,
} from "@/features/budget-requests/proposal-details";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

interface BudgetRequestGeneralStepProps extends BudgetProposalStepProps {
  errors: BudgetRequestState["errors"];
  fiscalYearId: string;
  onFiscalYearChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onRationaleChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  options: BudgetFormOptions;
  organizationId: string;
  ownerName: string;
  projectType: string;
  rationale: string;
  title: string;
}

export function BudgetRequestGeneralStep({
  details,
  errors,
  fiscalYearId,
  onDetailChange,
  onFiscalYearChange,
  onOrganizationChange,
  onOwnerChange,
  onProjectTypeChange,
  onRationaleChange,
  onTitleChange,
  options,
  organizationId,
  ownerName,
  projectType,
  rationale,
  title,
}: BudgetRequestGeneralStepProps) {
  return (
    <div className="space-y-6">
      <BudgetRequestFormSection
        title="ข้อมูลคำขอ"
        description="ระบุชื่อ หน่วยงาน ปีงบประมาณ และประเภทโครงการให้ค้นหาและติดตามได้ง่าย"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <FieldLabel required>ชื่อกิจกรรม/โครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              maxLength={300}
              required
              aria-invalid={Boolean(errors?.title?.length)}
            />
            <FieldError errors={errors?.title} />
          </label>
          <label>
            <FieldLabel required>หน่วยงานเจ้าของคำขอ</FieldLabel>
            <select
              className={fieldClass}
              value={organizationId}
              onChange={(event) => onOrganizationChange(event.target.value)}
              aria-describedby="budget-request-organization-help budget-request-organization-error"
              aria-invalid={Boolean(errors?.organizationId?.length)}
              required
            >
              {options.organizations.length === 0 ? (
                <option value="">ไม่พบหน่วยงานที่เปิดใช้งาน</option>
              ) : null}
              {options.organizations.map((organization) => (
                <option value={organization.id} key={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            <span
              id="budget-request-organization-help"
              className="mt-1.5 block text-xs text-stone-500"
            >
              รายการหน่วยงานตามโครงสร้างคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี
            </span>
            <FieldError errors={errors?.organizationId} id="budget-request-organization-error" />
          </label>
          <label>
            <FieldLabel>รหัสหน่วยงานย่อย</FieldLabel>
            <select
              className={fieldClass}
              value={details.organizationCode}
              onChange={(event) => onDetailChange("organizationCode", event.target.value)}
              aria-describedby="budget-request-organization-code-help budget-request-organization-code-error"
              aria-invalid={Boolean(getProposalFieldErrors(errors, "organizationCode")?.length)}
            >
              <option value="">กรุณาเลือกรหัสหน่วยงานย่อย</option>
              {BUDGET_ORGANIZATION_CODE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.value} — {option.label}
                </option>
              ))}
            </select>
            <span
              id="budget-request-organization-code-help"
              className="mt-1.5 block text-xs text-stone-500"
            >
              เลือกรหัสให้ตรงกับหน่วยงานเจ้าของคำขอ
            </span>
            <FieldError
              errors={getProposalFieldErrors(errors, "organizationCode")}
              id="budget-request-organization-code-error"
            />
          </label>
          <label>
            <FieldLabel required>ปีงบประมาณ</FieldLabel>
            <select
              className={fieldClass}
              value={fiscalYearId}
              onChange={(event) => onFiscalYearChange(event.target.value)}
              required
              aria-invalid={Boolean(errors?.fiscalYearId?.length)}
              aria-describedby={
                errors?.fiscalYearId?.length ? "budget-fiscal-year-error" : undefined
              }
            >
              {options.fiscalYears.map((fiscalYear) => (
                <option value={fiscalYear.id} key={fiscalYear.id}>
                  {fiscalYear.label}
                </option>
              ))}
            </select>
            <FieldError errors={errors?.fiscalYearId} id="budget-fiscal-year-error" />
          </label>
          <label className="md:col-span-2">
            <FieldLabel required>ประเภทโครงการ</FieldLabel>
            <input
              className={fieldClass}
              list="budget-project-type-options"
              value={projectType}
              onChange={(event) => onProjectTypeChange(event.target.value)}
              maxLength={120}
              required
              aria-invalid={Boolean(errors?.projectType?.length)}
            />
            <datalist id="budget-project-type-options">
              {BUDGET_PROJECT_TYPE_SUGGESTIONS.map((option) => (
                <option value={option} key={option} />
              ))}
            </datalist>
            <FieldError errors={errors?.projectType} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection
        title="ผู้รับผิดชอบและระยะเวลาดำเนินงาน"
        description="ข้อมูลตำแหน่งและวันที่ช่วยให้การมอบหมาย การอนุมัติ และรายงานผลต่อเนื่องกัน"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel required>ผู้รับผิดชอบหลัก</FieldLabel>
            <input
              className={fieldClass}
              value={ownerName}
              onChange={(event) => onOwnerChange(event.target.value)}
              placeholder="กรอกชื่อ-นามสกุล"
              autoComplete="off"
              maxLength={180}
              required
              aria-invalid={Boolean(errors?.ownerName?.length)}
            />
            <FieldError errors={errors?.ownerName} />
          </label>
          <label>
            <FieldLabel>ตำแหน่งผู้รับผิดชอบโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.ownerPosition}
              onChange={(event) => onDetailChange("ownerPosition", event.target.value)}
              placeholder="เช่น เจ้าหน้าที่บริหารงานทั่วไป"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "ownerPosition")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "ownerPosition")} />
          </label>
          <label>
            <FieldLabel>วันที่เริ่ม</FieldLabel>
            <input
              className={fieldClass}
              type="date"
              value={details.startsOn}
              onChange={(event) => onDetailChange("startsOn", event.target.value)}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "startsOn")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "startsOn")} />
          </label>
          <label>
            <FieldLabel>วันที่สิ้นสุด</FieldLabel>
            <input
              className={fieldClass}
              type="date"
              min={details.startsOn || undefined}
              value={details.endsOn}
              onChange={(event) => onDetailChange("endsOn", event.target.value)}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "endsOn")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "endsOn")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection title="หลักการและเหตุผล">
        <label className="block">
          <FieldLabel required>หลักการและเหตุผล</FieldLabel>
          <textarea
            className={areaClass}
            value={rationale}
            onChange={(event) => onRationaleChange(event.target.value)}
            maxLength={5000}
            aria-invalid={Boolean(errors?.rationale?.length)}
          />
          <FieldError errors={errors?.rationale} />
        </label>
      </BudgetRequestFormSection>
    </div>
  );
}
