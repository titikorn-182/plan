"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel, areaClass, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import { SdgSelector } from "@/components/ui/sdg-selector";
import { FISCAL_MONTHS } from "@/features/projects/proposal-details";
import type { ProjectProposalSectionProps as Props } from "./project-proposal-section-types";
import { removeAt, replaceAt } from "./project-proposal-section-utils";

export function ProposalPlan({
  details,
  setDetails,
  errors,
  disabled,
  startsOn,
  endsOn,
  setStartsOn,
  setEndsOn,
}: Props & {
  startsOn: string;
  endsOn: string;
  setStartsOn: (value: string) => void;
  setEndsOn: (value: string) => void;
}) {
  return (
    <RegisterSection title="เป้าหมาย แผนปฏิบัติการ และระยะเวลา">
      <fieldset className="space-y-6 p-5 sm:p-6" disabled={disabled}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <b className="text-sm">เป้าประสงค์และตัววัด</b>
              <p className="mt-1 text-xs text-stone-600">
                เชื่อมเป้าประสงค์กับตัววัดและค่าเป้าหมายที่ตรวจสอบได้
              </p>
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 border border-orange-300 px-4 text-sm font-bold text-orange-800 hover:bg-orange-50"
              type="button"
              onClick={() =>
                setDetails({
                  ...details,
                  goalIndicators: [
                    ...details.goalIndicators,
                    { goal: "", longTermIndicator: "", actionIndicator: "", unit: "", target: "" },
                  ],
                })
              }
            >
              <Plus size={16} /> เพิ่มเป้าประสงค์
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {details.goalIndicators.map((item, index) => (
              <div className="border border-stone-200 bg-stone-50 p-3" key={index}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className={fieldClass}
                    value={item.goal}
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        goalIndicators: replaceAt(details.goalIndicators, index, {
                          ...item,
                          goal: e.target.value,
                        }),
                      })
                    }
                    placeholder="เป้าประสงค์"
                  />
                  <input
                    className={fieldClass}
                    value={item.longTermIndicator}
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        goalIndicators: replaceAt(details.goalIndicators, index, {
                          ...item,
                          longTermIndicator: e.target.value,
                        }),
                      })
                    }
                    placeholder="ตัววัดแผนระยะยาว"
                  />
                  <input
                    className={fieldClass}
                    value={item.actionIndicator}
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        goalIndicators: replaceAt(details.goalIndicators, index, {
                          ...item,
                          actionIndicator: e.target.value,
                        }),
                      })
                    }
                    placeholder="ตัววัดแผนปฏิบัติการ"
                  />
                  <div className="grid grid-cols-[1fr_1fr_44px] gap-3">
                    <input
                      className={fieldClass}
                      value={item.unit}
                      onChange={(e) =>
                        setDetails({
                          ...details,
                          goalIndicators: replaceAt(details.goalIndicators, index, {
                            ...item,
                            unit: e.target.value,
                          }),
                        })
                      }
                      placeholder="หน่วย"
                    />
                    <input
                      className={fieldClass}
                      value={item.target}
                      onChange={(e) =>
                        setDetails({
                          ...details,
                          goalIndicators: replaceAt(details.goalIndicators, index, {
                            ...item,
                            target: e.target.value,
                          }),
                        })
                      }
                      placeholder="ค่าเป้าหมาย"
                    />
                    <button
                      className="mt-1.5 h-11 border border-stone-300 bg-white hover:border-red-300 hover:text-red-700"
                      type="button"
                      onClick={() =>
                        setDetails({
                          ...details,
                          goalIndicators: removeAt(details.goalIndicators, index),
                        })
                      }
                    >
                      <Trash2 className="mx-auto" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <FieldError errors={errors?.["proposalDetails.goalIndicators"]} />
        </div>
        <div className="border-t border-stone-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <b className="text-sm">แผนปฏิบัติการ</b>
              <p className="mt-1 text-xs text-stone-600">
                ปีงบประมาณเรียงเดือนตุลาคมถึงกันยายน และรายงานผลทุกไตรมาส
              </p>
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 border border-orange-300 px-4 text-sm font-bold text-orange-800 hover:bg-orange-50"
              type="button"
              onClick={() =>
                setDetails({
                  ...details,
                  actionPlan: [...details.actionPlan, { description: "", months: [] }],
                })
              }
            >
              <Plus size={16} /> เพิ่มขั้นตอน
            </button>
          </div>
          <FieldError errors={errors?.["proposalDetails.actionPlan"]} />
          <div className="mt-3 space-y-3">
            {details.actionPlan.map((item, index) => (
              <div className="border border-stone-200 p-3" key={index}>
                <div className="flex gap-3">
                  <input
                    className={fieldClass}
                    value={item.description}
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        actionPlan: replaceAt(details.actionPlan, index, {
                          ...item,
                          description: e.target.value,
                        }),
                      })
                    }
                    placeholder={`ขั้นตอนที่ ${index + 1}`}
                  />
                  <button
                    className="mt-1.5 h-11 w-11 shrink-0 border border-stone-300 hover:border-red-300 hover:text-red-700"
                    type="button"
                    onClick={() =>
                      setDetails({ ...details, actionPlan: removeAt(details.actionPlan, index) })
                    }
                  >
                    <Trash2 className="mx-auto" size={16} />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-6 lg:grid-cols-12">
                  {FISCAL_MONTHS.map((month, monthIndex) => (
                    <label
                      className="flex min-h-10 items-center justify-center gap-1 bg-white text-xs hover:bg-orange-50"
                      key={month}
                    >
                      <input
                        type="checkbox"
                        checked={item.months.includes(monthIndex)}
                        onChange={() =>
                          setDetails({
                            ...details,
                            actionPlan: replaceAt(details.actionPlan, index, {
                              ...item,
                              months: item.months.includes(monthIndex)
                                ? item.months.filter((value) => value !== monthIndex)
                                : [...item.months, monthIndex].sort((a, b) => a - b),
                            }),
                          })
                        }
                      />
                      {month}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-stone-200 pt-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-stone-950">
              ความสอดคล้องกับการพัฒนาที่ยั่งยืน (SDGs)
            </h3>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              เลือกเป้าหมายที่โครงการสนับสนุนและอธิบายความเชื่อมโยงกับผลลัพธ์ที่คาดหวัง
            </p>
          </div>
          <SdgSelector
            errorId="project-sdgs-error"
            errors={errors?.["proposalDetails.sdgs"]}
            selected={details.sdgs}
            onChange={(sdgs) => setDetails({ ...details, sdgs })}
          />
          <label className="mt-5 block">
            <FieldLabel required>คำอธิบายความเชื่อมโยง</FieldLabel>
            <textarea
              className={areaClass}
              value={details.sdgAlignmentDescription}
              onChange={(e) => setDetails({ ...details, sdgAlignmentDescription: e.target.value })}
              placeholder="อธิบายว่าโครงการสนับสนุน SDG ที่เลือกอย่างไร และจะเกิดผลลัพธ์ใด"
            />
            <FieldError errors={errors?.["proposalDetails.sdgAlignmentDescription"]} />
          </label>
        </div>
        <div className="grid gap-5 border-t border-stone-200 pt-5 md:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label>
              <FieldLabel required>วันเริ่มต้น</FieldLabel>
              <input
                className={fieldClass}
                name="startsOn"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
            </label>
            <label>
              <FieldLabel required>สัปดาห์เริ่มต้น</FieldLabel>
              <select
                className={fieldClass}
                value={details.startWeek ?? ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    startWeek: e.target.value ? Number(e.target.value) : null,
                  })
                }
                required
              >
                <option value="">เลือกสัปดาห์</option>
                {[1, 2, 3, 4].map((week) => (
                  <option key={week} value={week}>
                    สัปดาห์ที่ {week}
                  </option>
                ))}
              </select>
              <FieldError errors={errors?.["proposalDetails.startWeek"]} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label>
              <FieldLabel required>วันสิ้นสุด</FieldLabel>
              <input
                className={fieldClass}
                name="endsOn"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                required
              />
              <FieldError errors={errors?.endsOn} />
            </label>
            <label>
              <FieldLabel required>สัปดาห์สิ้นสุด</FieldLabel>
              <select
                className={fieldClass}
                value={details.endWeek ?? ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    endWeek: e.target.value ? Number(e.target.value) : null,
                  })
                }
                required
              >
                <option value="">เลือกสัปดาห์</option>
                {[1, 2, 3, 4].map((week) => (
                  <option key={week} value={week}>
                    สัปดาห์ที่ {week}
                  </option>
                ))}
              </select>
              <FieldError errors={errors?.["proposalDetails.endWeek"]} />
            </label>
          </div>
          <label className="md:col-span-2">
            <FieldLabel required>สถานที่ดำเนินการ</FieldLabel>
            <input
              className={fieldClass}
              value={details.location}
              onChange={(e) => setDetails({ ...details, location: e.target.value })}
            />
            <FieldError errors={errors?.["proposalDetails.location"]} />
          </label>
        </div>
      </fieldset>
    </RegisterSection>
  );
}
