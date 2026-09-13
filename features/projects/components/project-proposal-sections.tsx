"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel, areaClass, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import type { OperationState } from "@/features/shared/action-state";
import type { ProjectFormOptions } from "@/features/projects/types";
import {
  EXPENSE_CATEGORIES,
  EFFICIENCY_CHECKS,
  FACULTY_STRATEGIES,
  FISCAL_MONTHS,
  PROJECT_CHARACTERISTICS,
  type ProjectProposalDetails,
} from "@/features/projects/proposal-details";

type Props = {
  details: ProjectProposalDetails;
  setDetails: (details: ProjectProposalDetails) => void;
  errors: OperationState["errors"];
  disabled: boolean;
};

const removeAt = <T,>(items: readonly T[], index: number) => items.filter((_, i) => i !== index);
const replaceAt = <T,>(items: readonly T[], index: number, value: T) =>
  items.map((item, i) => (i === index ? value : item));

export function ProposalBasics({
  options,
  organizationId,
  fiscalYearId,
  title,
  ownerName,
  setOrganizationId,
  setFiscalYearId,
  setTitle,
  setOwnerName,
  details,
  setDetails,
  errors,
  disabled,
}: Props & {
  options: ProjectFormOptions;
  organizationId: string;
  fiscalYearId: string;
  title: string;
  ownerName: string;
  setOrganizationId: (value: string) => void;
  setFiscalYearId: (value: string) => void;
  setTitle: (value: string) => void;
  setOwnerName: (value: string) => void;
}) {
  const record = options.record;
  const toggleCharacteristic = (value: (typeof PROJECT_CHARACTERISTICS)[number]) => {
    setDetails({
      ...details,
      characteristics: details.characteristics.includes(value)
        ? details.characteristics.filter((item) => item !== value)
        : [...details.characteristics, value],
    });
  };
  return (
    <RegisterSection
      title="ข้อมูลโครงการและผู้รับผิดชอบ"
      aside={<span className="text-xs text-stone-500">ข้อมูลหลักของข้อเสนอ</span>}
    >
      <fieldset className="grid gap-5 p-5 sm:p-6 md:grid-cols-2" disabled={disabled}>
        <label className="md:col-span-2">
          <FieldLabel required>ชื่อโครงการ</FieldLabel>
          <input
            className={fieldClass}
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />
          <FieldError errors={errors?.title} />
        </label>
        <label>
          <FieldLabel required>หน่วยงานเจ้าของโครงการ</FieldLabel>
          <select
            className={fieldClass}
            name="organizationId"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            required
          >
            {options.organizations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.label}
              </option>
            ))}
          </select>
          <FieldError errors={errors?.organizationId} />
        </label>
        <label>
          <FieldLabel required>ปีงบประมาณ</FieldLabel>
          <select
            className={fieldClass}
            name="fiscalYearId"
            value={fiscalYearId}
            onChange={(e) => setFiscalYearId(e.target.value)}
            required
          >
            {options.fiscalYears.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <FieldLabel>อ้างอิงคำของบที่อนุมัติ</FieldLabel>
          <select
            className={fieldClass}
            name="budgetRequestId"
            defaultValue={record?.budgetRequestId ?? ""}
          >
            <option value="">ไม่ผูกคำของบ</option>
            {options.budgetRequests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <FieldLabel required>ลักษณะของโครงการ/กิจกรรม</FieldLabel>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {PROJECT_CHARACTERISTICS.map((item) => (
              <label
                className="flex min-h-11 items-start gap-3 border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm hover:border-orange-300"
                key={item}
              >
                <input
                  className="mt-0.5 size-4 accent-[#cf430c]"
                  type="checkbox"
                  checked={details.characteristics.includes(item)}
                  onChange={() => toggleCharacteristic(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <input
            className={fieldClass}
            value={details.otherCharacteristic}
            onChange={(e) => setDetails({ ...details, otherCharacteristic: e.target.value })}
            placeholder="อื่น ๆ โปรดระบุ (ถ้ามี)"
            maxLength={300}
          />
          <FieldError errors={errors?.["proposalDetails.characteristics"]} />
        </div>
        <label>
          <FieldLabel required>หัวหน้าโครงการ</FieldLabel>
          <input
            className={fieldClass}
            name="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            maxLength={180}
            required
          />
          <FieldError errors={errors?.ownerName} />
        </label>
        <label>
          <FieldLabel>ตำแหน่งหัวหน้าโครงการ</FieldLabel>
          <input
            className={fieldClass}
            value={details.projectHeadPosition}
            onChange={(e) => setDetails({ ...details, projectHeadPosition: e.target.value })}
            maxLength={300}
          />
        </label>
        <div className="border-t border-stone-200 pt-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <b className="text-sm">ผู้รับผิดชอบโครงการ</b>
              <p className="mt-1 text-xs text-stone-600">
                เพิ่มได้หลายคน หากไม่มีสามารถเว้นว่างได้
              </p>
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 border border-orange-300 px-4 text-sm font-bold text-orange-800 hover:bg-orange-50"
              type="button"
              onClick={() =>
                setDetails({
                  ...details,
                  responsiblePeople: [...details.responsiblePeople, { name: "", position: "" }],
                })
              }
            >
              <Plus size={16} /> เพิ่มผู้รับผิดชอบ
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {details.responsiblePeople.map((person, index) => (
              <div
                className="grid gap-3 border border-stone-200 bg-stone-50 p-3 md:grid-cols-[1fr_1fr_44px]"
                key={index}
              >
                <input
                  className={fieldClass}
                  value={person.name}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      responsiblePeople: replaceAt(details.responsiblePeople, index, {
                        ...person,
                        name: e.target.value,
                      }),
                    })
                  }
                  placeholder={`ชื่อ-นามสกุล คนที่ ${index + 1}`}
                />
                <input
                  className={fieldClass}
                  value={person.position}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      responsiblePeople: replaceAt(details.responsiblePeople, index, {
                        ...person,
                        position: e.target.value,
                      }),
                    })
                  }
                  placeholder="ตำแหน่งหรือหน้าที่"
                />
                <button
                  className="mt-1.5 h-11 border border-stone-300 bg-white text-stone-600 hover:border-red-300 hover:text-red-700"
                  type="button"
                  onClick={() =>
                    setDetails({
                      ...details,
                      responsiblePeople: removeAt(details.responsiblePeople, index),
                    })
                  }
                  aria-label={`ลบผู้รับผิดชอบคนที่ ${index + 1}`}
                >
                  <Trash2 className="mx-auto" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </fieldset>
    </RegisterSection>
  );
}

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

export function ProposalBudget({
  details,
  setDetails,
  errors,
  disabled,
  target,
  setTarget,
}: Props & { target: string; setTarget: (value: string) => void }) {
  const total = details.expenseItems.reduce((sum, item) => sum + item.amount, 0);
  return (
    <RegisterSection
      title="รายละเอียดงบประมาณ"
      aside={
        <b className="text-sm tabular-nums text-[#b83b0b]">
          รวม {total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
        </b>
      }
    >
      <fieldset className="space-y-4 p-5 sm:p-6" disabled={disabled}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-xs leading-5 text-stone-600">
            แจกแจงเฉพาะค่าตอบแทน ค่าใช้สอย และค่าวัสดุ ระบบจะรวมเป็นวงเงินอนุมัติให้อัตโนมัติ
            และถือถัวเฉลี่ยได้ทุกรายการ
          </p>
          <button
            className="inline-flex min-h-10 items-center gap-2 border border-orange-300 px-4 text-sm font-bold text-orange-800 hover:bg-orange-50"
            type="button"
            onClick={() =>
              setDetails({
                ...details,
                expenseItems: [
                  ...details.expenseItems,
                  { category: "ค่าตอบแทน", description: "", amount: 0 },
                ],
              })
            }
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>
        </div>
        <FieldError errors={errors?.["proposalDetails.expenseItems"]} />
        <div className="space-y-3">
          {details.expenseItems.map((item, index) => (
            <div
              className="grid gap-3 border border-stone-200 bg-stone-50 p-3 md:grid-cols-[180px_1fr_180px_44px]"
              key={index}
            >
              <select
                className={fieldClass}
                value={item.category}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    expenseItems: replaceAt(details.expenseItems, index, {
                      ...item,
                      category: e.target.value as (typeof EXPENSE_CATEGORIES)[number],
                    }),
                  })
                }
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <input
                className={fieldClass}
                value={item.description}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    expenseItems: replaceAt(details.expenseItems, index, {
                      ...item,
                      description: e.target.value,
                    }),
                  })
                }
                placeholder="รายละเอียดรายการค่าใช้จ่าย"
              />
              <input
                className={`${fieldClass} text-right tabular-nums`}
                type="number"
                min="0"
                step="0.01"
                value={item.amount || ""}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    expenseItems: replaceAt(details.expenseItems, index, {
                      ...item,
                      amount: Number(e.target.value),
                    }),
                  })
                }
                placeholder="0.00"
              />
              <button
                className="mt-1.5 h-11 border border-stone-300 bg-white hover:border-red-300 hover:text-red-700"
                type="button"
                onClick={() =>
                  setDetails({ ...details, expenseItems: removeAt(details.expenseItems, index) })
                }
              >
                <Trash2 className="mx-auto" size={16} />
              </button>
            </div>
          ))}
        </div>
        <label className="block max-w-sm border-t border-stone-200 pt-4">
          <FieldLabel required>เป้าหมายเบิกจ่าย (%)</FieldLabel>
          <input
            className={`${fieldClass} text-right tabular-nums`}
            name="disbursementTarget"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </label>
      </fieldset>
    </RegisterSection>
  );
}

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
            <li>ส่งใช้ใบสำคัญภายใน 30 วันหลังเสร็จสิ้นโครงการ</li>
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
