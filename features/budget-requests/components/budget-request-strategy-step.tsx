import { areaClass, FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { BudgetRequestFormSection } from "@/features/budget-requests/components/budget-request-form-section";
import {
  getProposalFieldErrors,
  type BudgetProposalStepProps,
} from "@/features/budget-requests/components/budget-request-step-types";
import {
  BUDGET_FUND_OPTIONS,
  BUDGET_FUNDING_SOURCE_SUGGESTIONS,
  BUDGET_SDG_OPTIONS,
} from "@/features/budget-requests/proposal-details";

export function BudgetRequestStrategyStep({
  details,
  errors,
  onDetailChange,
}: BudgetProposalStepProps) {
  const hasUnlistedFund =
    details.fundName.length > 0 &&
    !BUDGET_FUND_OPTIONS.some((option) => option.name === details.fundName);

  return (
    <div className="space-y-6">
      <BudgetRequestFormSection
        title="แหล่งงบประมาณและกองทุน"
        description="ระบุสายงบประมาณให้ตรงกับข้อมูลต้นทาง เพื่อใช้จำแนกและออกรายงานได้ถูกต้อง"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel>แหล่งงบประมาณ</FieldLabel>
            <input
              className={fieldClass}
              list="budget-funding-source-options"
              value={details.fundingSource}
              onChange={(event) => onDetailChange("fundingSource", event.target.value)}
              placeholder="เช่น เงินรายได้"
              maxLength={120}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "fundingSource")?.length)}
            />
            <datalist id="budget-funding-source-options">
              {BUDGET_FUNDING_SOURCE_SUGGESTIONS.map((option) => (
                <option value={option} key={option} />
              ))}
            </datalist>
            <FieldError errors={getProposalFieldErrors(errors, "fundingSource")} />
          </label>
          <label>
            <FieldLabel>กองทุน</FieldLabel>
            <select
              className={fieldClass}
              value={details.fundName}
              onChange={(event) => onDetailChange("fundName", event.target.value)}
              aria-describedby="budget-request-fund-help budget-request-fund-error"
              aria-invalid={Boolean(getProposalFieldErrors(errors, "fundName")?.length)}
            >
              <option value="">กรุณาเลือกกองทุน</option>
              {hasUnlistedFund ? (
                <option value={details.fundName}>ข้อมูลเดิม — {details.fundName}</option>
              ) : null}
              {BUDGET_FUND_OPTIONS.map((option) => (
                <option value={option.name} key={option.code}>
                  กองทุน {option.code} — {option.name}
                </option>
              ))}
            </select>
            <span id="budget-request-fund-help" className="mt-1.5 block text-xs text-stone-500">
              เลือกกองทุนให้ตรงกับแผนงบประมาณของโครงการ
            </span>
            <FieldError
              errors={getProposalFieldErrors(errors, "fundName")}
              id="budget-request-fund-error"
            />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>แหล่งงบประมาณย่อย</FieldLabel>
            <textarea
              className={areaClass}
              value={details.fundingSourceDetail}
              onChange={(event) => onDetailChange("fundingSourceDetail", event.target.value)}
              placeholder="ระบุที่มาหรือเงื่อนไขของแหล่งงบประมาณ"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "fundingSourceDetail")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "fundingSourceDetail")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection
        title="ความเชื่อมโยงยุทธศาสตร์"
        description="เรียงจากพันธกิจและยุทธศาสตร์ไปยังแผนปฏิบัติการและรหัสกิจกรรม เพื่อให้ตรวจสอบย้อนกลับได้"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel>ชื่อพันธกิจ</FieldLabel>
            <input
              className={fieldClass}
              value={details.missionName}
              onChange={(event) => onDetailChange("missionName", event.target.value)}
              placeholder="เช่น พันธกิจที่ 3 ด้านการบริการวิชาการ"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "missionName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "missionName")} />
          </label>
          <label>
            <FieldLabel>ยุทธศาสตร์มหาวิทยาลัย</FieldLabel>
            <input
              className={fieldClass}
              value={details.universityStrategy}
              onChange={(event) => onDetailChange("universityStrategy", event.target.value)}
              placeholder="ระบุยุทธศาสตร์ที่โครงการสนับสนุน"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "universityStrategy")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "universityStrategy")} />
          </label>
          <label>
            <FieldLabel>เป้าประสงค์</FieldLabel>
            <input
              className={fieldClass}
              value={details.goalName}
              onChange={(event) => onDetailChange("goalName", event.target.value)}
              placeholder="ระบุเป้าประสงค์"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "goalName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "goalName")} />
          </label>
          <label>
            <FieldLabel>ชื่อกลยุทธ์</FieldLabel>
            <input
              className={fieldClass}
              value={details.strategyName}
              onChange={(event) => onDetailChange("strategyName", event.target.value)}
              placeholder="ระบุกลยุทธ์ของคณะหรือมหาวิทยาลัย"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "strategyName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "strategyName")} />
          </label>
          <label>
            <FieldLabel>รหัสแผนปฏิบัติการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.operationalPlanCode}
              onChange={(event) => onDetailChange("operationalPlanCode", event.target.value)}
              placeholder="รหัส 8 หลัก"
              inputMode="numeric"
              maxLength={120}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "operationalPlanCode")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "operationalPlanCode")} />
          </label>
          <label>
            <FieldLabel>แผนงาน / ชื่อแผนปฏิบัติการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.operationalPlanName}
              onChange={(event) => onDetailChange("operationalPlanName", event.target.value)}
              placeholder="ระบุชื่อแผนปฏิบัติการ"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "operationalPlanName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "operationalPlanName")} />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>รหัสโครงการ/กิจกรรม</FieldLabel>
            <input
              className={fieldClass}
              value={details.activityCode}
              onChange={(event) => onDetailChange("activityCode", event.target.value)}
              placeholder="รหัส 12 หลัก"
              inputMode="numeric"
              maxLength={120}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "activityCode")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "activityCode")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection title="ความเชื่อมโยง SDGs">
        <fieldset>
          <legend className="sr-only">เลือกเป้าหมายการพัฒนาที่ยั่งยืน</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {BUDGET_SDG_OPTIONS.map((label) => (
              <label
                className="flex min-h-12 items-start gap-3 border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-5 transition-colors hover:border-orange-300 hover:bg-orange-50/60"
                key={label}
              >
                <input
                  className="mt-1 accent-[#cf430c]"
                  type="checkbox"
                  checked={details.sdgs.includes(label)}
                  onChange={(event) =>
                    onDetailChange(
                      "sdgs",
                      event.target.checked
                        ? [...details.sdgs, label]
                        : details.sdgs.filter((item) => item !== label),
                    )
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <FieldError errors={getProposalFieldErrors(errors, "sdgs")} />
        </fieldset>
        <label className="mt-5 block">
          <FieldLabel>คำอธิบายความสอดคล้อง</FieldLabel>
          <textarea
            className={areaClass}
            value={details.alignmentDescription}
            onChange={(event) => onDetailChange("alignmentDescription", event.target.value)}
            placeholder="อธิบายว่าโครงการสนับสนุนพันธกิจ ยุทธศาสตร์ แผนงาน และ SDGs อย่างไร"
            maxLength={5000}
            aria-invalid={Boolean(getProposalFieldErrors(errors, "alignmentDescription")?.length)}
          />
          <FieldError errors={getProposalFieldErrors(errors, "alignmentDescription")} />
        </label>
      </BudgetRequestFormSection>
    </div>
  );
}
