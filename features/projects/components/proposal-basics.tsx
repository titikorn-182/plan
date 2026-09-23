"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import type { ProjectFormOptions } from "@/features/projects/types";
import { PROJECT_CHARACTERISTICS } from "@/features/projects/proposal-details";
import { INPUT_LIMITS } from "@/lib/config/limits";
import type { ProjectProposalSectionProps as Props } from "./project-proposal-section-types";
import { removeAt, replaceAt } from "./project-proposal-section-utils";
import { ApprovedBudgetSelector } from "./approved-budget-selector";
import type { ApprovedBudgetSourceControl } from "@/features/projects/hooks/use-approved-budget-source";

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
  source,
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
  source: ApprovedBudgetSourceControl;
}) {
  const lockedSource = Boolean(source.budgetRequestId);
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
        <ApprovedBudgetSelector
          options={options}
          source={source}
          title={title}
          setTitle={setTitle}
          errors={errors}
          disabled={disabled}
        />
        <fieldset className="contents" disabled={source.loading}>
          <label>
            <FieldLabel required>หน่วยงานเจ้าของโครงการ</FieldLabel>
            <select
              className={fieldClass}
              name={lockedSource ? undefined : "organizationId"}
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
              disabled={lockedSource || source.loading}
            >
              {options.organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.label}
                </option>
              ))}
            </select>
            {lockedSource ? (
              <input type="hidden" name="organizationId" value={organizationId} />
            ) : null}
            <FieldError errors={errors?.organizationId} />
          </label>
          <label>
            <FieldLabel required>ปีงบประมาณ</FieldLabel>
            <select
              className={fieldClass}
              name={lockedSource ? undefined : "fiscalYearId"}
              value={fiscalYearId}
              onChange={(e) => setFiscalYearId(e.target.value)}
              required
              disabled={lockedSource || source.loading}
            >
              {options.fiscalYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {lockedSource ? <input type="hidden" name="fiscalYearId" value={fiscalYearId} /> : null}
            <FieldError errors={errors?.fiscalYearId} />
          </label>
          {lockedSource ? (
            <p className="text-xs text-stone-600 md:col-span-2">
              หน่วยงานและปีงบประมาณใช้ตามคำของบอ้างอิง หากต้องการเปลี่ยน
              ให้เลือกคำของบใหม่หรือยกเลิกการอ้างอิง
            </p>
          ) : null}
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
              maxLength={INPUT_LIMITS.title}
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
              maxLength={INPUT_LIMITS.personName}
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
              maxLength={INPUT_LIMITS.title}
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
      </fieldset>
    </RegisterSection>
  );
}
