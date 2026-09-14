"use client";

import { FieldError, FieldLabel, areaClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import { EFFICIENCY_CHECKS, FACULTY_STRATEGIES } from "@/features/projects/proposal-details";
import type { ProjectProposalSectionProps as Props } from "./project-proposal-section-types";

export function ProposalAlignment({ details, setDetails, errors, disabled }: Props) {
  const toggleStrategy = (value: (typeof FACULTY_STRATEGIES)[number]) =>
    setDetails({
      ...details,
      strategies: details.strategies.includes(value)
        ? details.strategies.filter((item) => item !== value)
        : [...details.strategies, value],
    });
  return (
    <RegisterSection title="ความสอดคล้องและเหตุผล">
      <fieldset className="space-y-5 p-5 sm:p-6" disabled={disabled}>
        <div>
          <FieldLabel required>กลยุทธ์และเป้าประสงค์คณะรัฐศาสตร์</FieldLabel>
          <div className="mt-2 space-y-2">
            {FACULTY_STRATEGIES.map((item) => (
              <label
                className="flex items-start gap-3 border border-stone-200 px-3 py-3 text-sm hover:border-orange-300"
                key={item}
              >
                <input
                  className="mt-0.5 size-4 accent-[#cf430c]"
                  type="checkbox"
                  checked={details.strategies.includes(item)}
                  onChange={() => toggleStrategy(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <FieldError errors={errors?.["proposalDetails.strategies"]} />
        </div>
        <div>
          <FieldLabel required>ความต่อเนื่องของโครงการ</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={details.continuity === "new"}
                onChange={() => setDetails({ ...details, continuity: "new" })}
              />{" "}
              โครงการใหม่
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={details.continuity === "continuing"}
                onChange={() => setDetails({ ...details, continuity: "continuing" })}
              />{" "}
              โครงการต่อเนื่องจากปีก่อน
            </label>
          </div>
          {details.continuity === "continuing" ? (
            <div className="mt-3 space-y-3">
              <textarea
                className={areaClass}
                value={details.previousSuccess}
                onChange={(e) => setDetails({ ...details, previousSuccess: e.target.value })}
                placeholder="สรุปผลสำเร็จของโครงการในปีที่ผ่านมา"
              />
              <FieldError errors={errors?.["proposalDetails.previousSuccess"]} />
              <div className="grid gap-2 md:grid-cols-3">
                {EFFICIENCY_CHECKS.map((check) => (
                  <label
                    className="flex items-start gap-2 border border-stone-200 bg-stone-50 p-3 text-xs leading-5"
                    key={check.value}
                  >
                    <input
                      className="mt-0.5 size-4 accent-[#cf430c]"
                      type="checkbox"
                      checked={details.efficiencyChecks.includes(check.value)}
                      onChange={() =>
                        setDetails({
                          ...details,
                          efficiencyChecks: details.efficiencyChecks.includes(check.value)
                            ? details.efficiencyChecks.filter((item) => item !== check.value)
                            : [...details.efficiencyChecks, check.value],
                        })
                      }
                    />
                    {check.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <label className="block">
          <FieldLabel required>หลักการและเหตุผล</FieldLabel>
          <textarea
            className={areaClass}
            value={details.rationale}
            onChange={(e) => setDetails({ ...details, rationale: e.target.value })}
          />
          <FieldError errors={errors?.["proposalDetails.rationale"]} />
        </label>
        <label className="block">
          <FieldLabel required>วัตถุประสงค์</FieldLabel>
          <textarea
            className={areaClass}
            value={details.objectives}
            onChange={(e) => setDetails({ ...details, objectives: e.target.value })}
          />
          <FieldError errors={errors?.["proposalDetails.objectives"]} />
        </label>
        <label className="block">
          <FieldLabel required>กลุ่มเป้าหมาย</FieldLabel>
          <textarea
            className={areaClass}
            value={details.targetGroup}
            onChange={(e) => setDetails({ ...details, targetGroup: e.target.value })}
            placeholder="ระบุทั้งข้อมูลเชิงคุณภาพและเชิงปริมาณ"
          />
          <FieldError errors={errors?.["proposalDetails.targetGroup"]} />
        </label>
      </fieldset>
    </RegisterSection>
  );
}
