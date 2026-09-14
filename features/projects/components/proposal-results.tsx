"use client";

import { FieldError, FieldLabel, areaClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import type { ProjectProposalSectionProps as Props } from "./project-proposal-section-types";

export function ProposalResults({ details, setDetails, errors, disabled }: Props) {
  return (
    <RegisterSection title="ผลลัพธ์ ตัวชี้วัด และการติดตาม">
      <fieldset className="grid gap-5 p-5 sm:p-6" disabled={disabled}>
        <label>
          <FieldLabel required>ผลที่คาดว่าจะได้รับ</FieldLabel>
          <textarea
            className={areaClass}
            value={details.expectedResults}
            onChange={(e) => setDetails({ ...details, expectedResults: e.target.value })}
          />
          <FieldError errors={errors?.["proposalDetails.expectedResults"]} />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel required>ตัวชี้วัดระดับกระบวนการ</FieldLabel>
            <textarea
              className={areaClass}
              value={details.processIndicator}
              onChange={(e) => setDetails({ ...details, processIndicator: e.target.value })}
            />
            <FieldError errors={errors?.["proposalDetails.processIndicator"]} />
          </label>
          <label>
            <FieldLabel required>ตัวชี้วัดระดับผลผลิต</FieldLabel>
            <textarea
              className={areaClass}
              value={details.outputIndicator}
              onChange={(e) => setDetails({ ...details, outputIndicator: e.target.value })}
            />
            <FieldError errors={errors?.["proposalDetails.outputIndicator"]} />
          </label>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <b>เงื่อนไขการติดตามหลังสิ้นสุดโครงการ</b>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
            <li>ส่งใช้ใบสำคัญภายใน 15 วันหลังเสร็จสิ้นโครงการ</li>
            <li>ส่งรายงานผลโครงการภายใน 15 วันหลังเสร็จสิ้นโครงการ</li>
          </ul>
        </div>
        <p className="text-xs leading-5 text-stone-600">
          ชื่อผู้เสนอ ผู้เห็นชอบ และผู้อนุมัติจะถูกบันทึกจากบัญชีผู้ใช้และ workflow
          จึงไม่ต้องกรอกลายเซ็นซ้ำในแบบฟอร์ม
        </p>
      </fieldset>
    </RegisterSection>
  );
}
