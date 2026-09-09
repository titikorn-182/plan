import { areaClass, FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { BudgetRequestFormSection } from "@/features/budget-requests/components/budget-request-form-section";
import {
  getProposalFieldErrors,
  type BudgetProposalStepProps,
} from "@/features/budget-requests/components/budget-request-step-types";

export function BudgetRequestOutputsStep({
  details,
  errors,
  onDetailChange,
}: BudgetProposalStepProps) {
  return (
    <div className="space-y-6">
      <BudgetRequestFormSection
        title="รหัสอ้างอิงและผลผลิต"
        description="ข้อมูลชุดนี้ใช้เชื่อมคำของบกับโครงสร้างงาน โครงการ และกิจกรรมในรายงานส่วนกลาง"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel>รหัสผลผลิต/โครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.outputCode}
              onChange={(event) => onDetailChange("outputCode", event.target.value)}
              placeholder="รหัส 4 หลัก"
              inputMode="numeric"
              maxLength={120}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "outputCode")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "outputCode")} />
          </label>
          <label>
            <FieldLabel>ชื่อผลผลิต/โครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.outputName}
              onChange={(event) => onDetailChange("outputName", event.target.value)}
              placeholder="ระบุชื่อผลผลิตหรือโครงการตามแผน"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "outputName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "outputName")} />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>ชื่อกิจกรรมย่อยภายใต้โครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.subActivityName}
              onChange={(event) => onDetailChange("subActivityName", event.target.value)}
              placeholder="ระบุกิจกรรมย่อยที่ใช้งบประมาณรายการนี้"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "subActivityName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "subActivityName")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection
        title="ผลลัพธ์ของโครงการ"
        description="เขียนให้วัดผลได้และสอดคล้องกับกลุ่มเป้าหมาย เพื่อใช้ติดตามผลหลังได้รับอนุมัติ"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <FieldLabel>วัตถุประสงค์</FieldLabel>
            <textarea
              className={areaClass}
              value={details.objectives}
              onChange={(event) => onDetailChange("objectives", event.target.value)}
              placeholder="ระบุวัตถุประสงค์เป็นข้อ ๆ"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "objectives")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "objectives")} />
          </label>
          <label>
            <FieldLabel>กลุ่มเป้าหมาย</FieldLabel>
            <textarea
              className={areaClass}
              value={details.targetGroup}
              onChange={(event) => onDetailChange("targetGroup", event.target.value)}
              placeholder="ระบุกลุ่มและจำนวนผู้ได้รับประโยชน์"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "targetGroup")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "targetGroup")} />
          </label>
          <label>
            <FieldLabel>ประโยชน์ที่คาดว่าจะได้รับ</FieldLabel>
            <textarea
              className={areaClass}
              value={details.expectedBenefits}
              onChange={(event) => onDetailChange("expectedBenefits", event.target.value)}
              placeholder="ระบุผลที่ผู้รับบริการหรือหน่วยงานจะได้รับ"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "expectedBenefits")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "expectedBenefits")} />
          </label>
          <label className="md:col-span-2">
            <FieldLabel>ตัวชี้วัดความสำเร็จ</FieldLabel>
            <textarea
              className={areaClass}
              value={details.successIndicators}
              onChange={(event) => onDetailChange("successIndicators", event.target.value)}
              placeholder="ระบุตัวชี้วัด ค่าเป้าหมาย และหน่วยนับ"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "successIndicators")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "successIndicators")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection
        title="สายการเห็นชอบและอนุมัติ"
        description="ระบุชื่อและตำแหน่งตามลำดับการเสนอเอกสารของหน่วยงาน"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel>ผู้เห็นชอบโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.reviewerName}
              onChange={(event) => onDetailChange("reviewerName", event.target.value)}
              placeholder="ชื่อ-นามสกุล"
              maxLength={180}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "reviewerName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "reviewerName")} />
          </label>
          <label>
            <FieldLabel>ตำแหน่งผู้เห็นชอบโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.reviewerPosition}
              onChange={(event) => onDetailChange("reviewerPosition", event.target.value)}
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "reviewerPosition")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "reviewerPosition")} />
          </label>
          <label>
            <FieldLabel>ผู้อนุมัติโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.approverName}
              onChange={(event) => onDetailChange("approverName", event.target.value)}
              placeholder="ชื่อ-นามสกุล"
              maxLength={180}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "approverName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "approverName")} />
          </label>
          <label>
            <FieldLabel>ตำแหน่งผู้อนุมัติโครงการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.approverPosition}
              onChange={(event) => onDetailChange("approverPosition", event.target.value)}
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "approverPosition")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "approverPosition")} />
          </label>
        </div>
      </BudgetRequestFormSection>
    </div>
  );
}
