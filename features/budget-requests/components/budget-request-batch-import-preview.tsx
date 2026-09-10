"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileStack,
  LoaderCircle,
  Rows3,
  Save,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FieldLabel, fieldClass } from "@/components/ui/operation-form";
import {
  saveBudgetRequestBatchAction,
  type BudgetRequestBatchState,
} from "@/features/budget-requests/batch-actions";
import type {
  BudgetRequestBatchGroup,
  BudgetRequestBatchPayload,
} from "@/features/budget-requests/batch-import";
import { getBudgetRequestOrganizationSourceCode } from "@/features/budget-requests/organization-options";
import type { BudgetFormOptions } from "@/features/budget-requests/types";
import {
  BudgetRequestBatchImportGroup,
  type BudgetRequestBatchEditableKey,
} from "@/features/budget-requests/components/budget-request-batch-import-group";

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function organizationSource(group: BudgetRequestBatchGroup) {
  return {
    code: group.values.organizationCode,
    key: group.sourceOrganizationKey,
    name: group.values.organizationName,
  };
}

function compatibleOrganizations(code: string, organizations: BudgetFormOptions["organizations"]) {
  return organizations.filter(
    (organization) => !code || getBudgetRequestOrganizationSourceCode(organization.name) === code,
  );
}

function initialOrganizationMappings(
  groups: readonly BudgetRequestBatchGroup[],
  organizations: BudgetFormOptions["organizations"],
): Record<string, string> {
  return Object.fromEntries(
    [
      ...new Map(
        groups.map((group) => [group.sourceOrganizationKey, organizationSource(group)]),
      ).values(),
    ].map((source) => {
      const compatible = compatibleOrganizations(source.code, organizations);
      const exact = compatible.find(
        (organization) => organization.name.trim() === source.name.trim(),
      );
      return [source.key, exact?.id ?? (compatible.length === 1 ? compatible[0].id : "")];
    }),
  );
}

export function BudgetRequestBatchImportPreview({
  groups: importedGroups,
  options,
}: {
  groups: readonly BudgetRequestBatchGroup[];
  options: BudgetFormOptions;
}) {
  const initialFiscalYear = options.fiscalYears[0];
  const [groups, setGroups] = useState(() => importedGroups.map((group) => ({ ...group })));
  const [selectedIds, setSelectedIds] = useState(
    () =>
      new Set(importedGroups.filter((group) => group.errors.length === 0).map((group) => group.id)),
  );
  const [fiscalYearId, setFiscalYearId] = useState(initialFiscalYear?.id ?? "");
  const [budgetCycleId, setBudgetCycleId] = useState(initialFiscalYear?.budgetCycleId ?? "");
  const [organizationMappings, setOrganizationMappings] = useState(() =>
    initialOrganizationMappings(importedGroups, options.organizations),
  );
  const [state, batchAction, pending] = useActionState(
    saveBudgetRequestBatchAction,
    {} satisfies BudgetRequestBatchState,
  );

  const organizationSources = useMemo(
    () => [
      ...new Map(
        groups.map((group) => [group.sourceOrganizationKey, organizationSource(group)]),
      ).values(),
    ],
    [groups],
  );
  const selectedGroups = groups.filter((group) => selectedIds.has(group.id));
  const totalRows = groups.reduce((sum, group) => sum + group.rowNumbers.length, 0);
  const selectedAmount =
    selectedGroups.reduce((sum, group) => sum + Math.round(group.totalAmount * 100), 0) / 100;
  const selectedSourceKeys = new Set(selectedGroups.map((group) => group.sourceOrganizationKey));
  const missingMappings = organizationSources.filter(
    (source) => selectedSourceKeys.has(source.key) && !organizationMappings[source.key],
  );
  const selectedProblems = selectedGroups.filter(
    (group) => group.errors.length > 0 || group.values.ownerName.trim().length < 2,
  );
  const selectableGroups = groups.filter((group) => group.errors.length === 0);
  const readyToSave =
    selectedGroups.length > 0 &&
    selectedProblems.length === 0 &&
    missingMappings.length === 0 &&
    Boolean(fiscalYearId && budgetCycleId) &&
    !state.success;

  const payload: BudgetRequestBatchPayload = {
    budgetCycleId,
    fiscalYearId,
    groups: selectedGroups.map((group) => ({
      expenseItems: group.expenseItems,
      id: group.id,
      organizationId: organizationMappings[group.sourceOrganizationKey] ?? "",
      projectMembers: group.projectMembers,
      rowNumbers: group.rowNumbers,
      values: group.values,
    })),
  };

  const updateGroupValue = (id: string, key: BudgetRequestBatchEditableKey, value: string) => {
    setGroups((current) =>
      current.map((group) =>
        group.id === id ? { ...group, values: { ...group.values, [key]: value } } : group,
      ),
    );
  };

  return (
    <div className="mt-5 border border-stone-200 bg-white">
      <input type="hidden" name="batchPayload" value={JSON.stringify(payload)} />

      <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h3 className="text-base font-extrabold text-stone-950">ตรวจสอบก่อนบันทึกแบบกลุ่ม</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-600">
              ระบบรวมแถวที่มีรหัสโครงการ/กิจกรรม 12 หลักเดียวกันเป็นหนึ่งคำขอ
              และเก็บแต่ละแถวเป็นรายละเอียดค่าใช้จ่าย
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <button
              className="border border-stone-300 bg-white px-3 py-2 text-stone-700 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
              type="button"
              onClick={() => setSelectedIds(new Set(selectableGroups.map((group) => group.id)))}
              disabled={state.success}
            >
              เลือกรายการที่อ่านได้ทั้งหมด
            </button>
            <button
              className="border border-stone-300 bg-white px-3 py-2 text-stone-700 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={state.success}
            >
              ล้างการเลือก
            </button>
          </div>
        </div>
      </div>

      <div className="grid border-b border-stone-200 bg-stone-50 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 sm:border-r xl:border-b-0">
          <Rows3 className="text-stone-500" size={19} />
          <span>
            <b className="block tabular-nums text-stone-950">{totalRows.toLocaleString("th-TH")}</b>
            <small className="text-stone-500">แถวข้อมูล</small>
          </span>
        </div>
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 xl:border-b-0 xl:border-r">
          <FileStack className="text-stone-500" size={19} />
          <span>
            <b className="block tabular-nums text-stone-950">
              {groups.length.toLocaleString("th-TH")}
            </b>
            <small className="text-stone-500">คำขอหลังจัดกลุ่ม</small>
          </span>
        </div>
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 sm:border-b-0 sm:border-r">
          <CheckCircle2 className="text-emerald-700" size={19} />
          <span>
            <b className="block tabular-nums text-stone-950">
              {selectedGroups.length.toLocaleString("th-TH")}
            </b>
            <small className="text-stone-500">คำขอที่เลือก</small>
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <WalletCards className="text-[#d83b0b]" size={19} />
          <span>
            <b className="block tabular-nums text-stone-950">
              {currency.format(selectedAmount)} บาท
            </b>
            <small className="text-stone-500">ยอดรวมที่เลือก</small>
          </span>
        </div>
      </div>

      <div className="grid gap-4 border-b border-stone-200 bg-[#fff8f4] px-4 py-4 sm:px-5 lg:grid-cols-2">
        <label>
          <FieldLabel required>ปีงบประมาณของคำขอทั้งหมด</FieldLabel>
          <select
            className={fieldClass}
            value={fiscalYearId}
            onChange={(event) => {
              const fiscalYear = options.fiscalYears.find((item) => item.id === event.target.value);
              setFiscalYearId(event.target.value);
              setBudgetCycleId(fiscalYear?.budgetCycleId ?? "");
            }}
            disabled={pending || state.success}
          >
            {options.fiscalYears.map((fiscalYear) => (
              <option key={fiscalYear.id} value={fiscalYear.id}>
                {fiscalYear.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <FieldLabel required>จับคู่หน่วยงานจากไฟล์</FieldLabel>
          <div className="space-y-2">
            {organizationSources.map((source) => {
              const compatible = compatibleOrganizations(source.code, options.organizations);
              return (
                <label
                  className="grid gap-2 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)] sm:items-center"
                  key={source.key}
                >
                  <span className="text-xs leading-5 text-stone-600">
                    {source.code || "ไม่มีรหัส"} {source.name || "ไม่ระบุชื่อหน่วยงาน"}
                  </span>
                  <select
                    className={fieldClass}
                    value={organizationMappings[source.key] ?? ""}
                    onChange={(event) =>
                      setOrganizationMappings((current) => ({
                        ...current,
                        [source.key]: event.target.value,
                      }))
                    }
                    disabled={pending || state.success}
                  >
                    <option value="">เลือกหน่วยงานในระบบ</option>
                    {compatible.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="divide-y divide-stone-200">
        {groups.map((group) => (
          <BudgetRequestBatchImportGroup
            checked={selectedIds.has(group.id)}
            disabled={pending || Boolean(state.success)}
            group={group}
            key={group.id}
            onCheckedChange={(checked) =>
              setSelectedIds((current) => {
                const next = new Set(current);
                if (checked) next.add(group.id);
                else next.delete(group.id);
                return next;
              })
            }
            onValueChange={(key, value) => updateGroupValue(group.id, key, value)}
          />
        ))}
      </div>

      <div className="border-t border-stone-200 px-4 py-4 sm:px-5">
        {missingMappings.length > 0 || selectedProblems.length > 0 ? (
          <p className="mb-3 flex items-start gap-2 text-xs leading-5 text-orange-900">
            <CircleAlert className="mt-0.5 shrink-0" size={15} />
            {missingMappings.length > 0
              ? `กรุณาจับคู่หน่วยงาน ${missingMappings.length.toLocaleString("th-TH")} รายการ`
              : `คำขอที่เลือก ${selectedProblems.length.toLocaleString("th-TH")} รายการยังมีข้อมูลที่ต้องแก้`}
          </p>
        ) : null}
        {state.errors?.length ? (
          <ul
            className="mb-3 space-y-1 border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            role="alert"
          >
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p
            className={`text-xs leading-5 ${state.success ? "text-emerald-700" : state.message ? "text-red-700" : "text-stone-600"}`}
            aria-live="polite"
          >
            {state.message ??
              "ระบบจะบันทึกเป็นฉบับร่าง และข้ามรหัสกิจกรรมที่มีอยู่แล้วในปีและหน่วยงานเดียวกัน"}
            {state.skippedCount
              ? ` ข้ามรายการซ้ำ ${state.skippedCount.toLocaleString("th-TH")} รายการ`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.success ? (
              <Link
                className="inline-flex h-10 items-center justify-center border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                href="/budget-requests"
              >
                เปิดทะเบียนคำของบ
              </Link>
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center gap-2 bg-[#cf430c] px-5 text-sm font-bold text-white hover:bg-[#ad3507] disabled:cursor-not-allowed disabled:bg-stone-300"
              type="submit"
              formAction={batchAction}
              disabled={!readyToSave || pending}
            >
              {pending ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {pending
                ? "กำลังบันทึก…"
                : `บันทึก ${selectedGroups.length.toLocaleString("th-TH")} คำขอเป็นฉบับร่าง`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
